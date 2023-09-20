import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
import { importHostedZone } from '../helpers';

/**
 * Properties required to create a VPC
 */
export interface CloudfrontProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Domain name to used to access app. */
  readonly domainName?: string;

  /** S3 bucket holding frontend code */
  readonly bucket: s3.IBucket;

  /** Whether Cloudfront is accessible */
  readonly enabled: boolean;

  /**
   * Whether to create custom domain name for distribution.
   * If "true" domainName param must be defined
   * */
  readonly createCustomDomain: boolean;
}

/**
 * Creates Cloudfront distribution for a frontend app
 */
export class FrontendCloudfront extends Construct {
  private parent: Construct;

  private cloudfront: cloudfront.IDistribution;
  private appPrefix: string;
  private bucket: s3.IBucket;
  private domainName: string | undefined;
  private rootDomainName: string | undefined;
  private enabled: boolean;
  private rootHostedZone: route53.IHostedZone;

  constructor(scope: Construct, id: string, props: CloudfrontProps) {
    super(scope, id);

    this.parent = scope;

    this.appPrefix = props.appPrefix;
    this.bucket = props.bucket;
    this.domainName = props.domainName;
    this.rootDomainName = this.setRootDomainName(props.domainName);

    this.cloudfront = this.createCloudfrontDistribution(props.createCustomDomain);
    if (props.createCustomDomain) {
      this.createRoute53Record();
    }
  }

  public getDistribution(): cloudfront.IDistribution {
    return this.cloudfront;
  }

  private createCloudfrontDistribution(createCustomDomainName: boolean) {
    const distributionProps: Record<string, any> = {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, {
          originAccessIdentity: this.createOriginAccessIdentity(),
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy: this.createResponseHeadersPolicy(),
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
      },
      enabled: this.enabled,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(10),
        },
      ],
    };

    if (createCustomDomainName) {
      distributionProps.certificate = this.requestAcmCertificate();
      distributionProps.domainNames = [this.domainName];
    }

    return new cloudfront.Distribution(
      this.parent,
      `${this.appPrefix}CloudFrontDistribution`,
      <cloudfront.DistributionProps>distributionProps,
    );
  }

  private createRoute53Record() {
    new route53.ARecord(this.parent, `${this.appPrefix}CloudfrontARecord`, {
      recordName: this.domainName,
      target: route53.RecordTarget.fromAlias(
        new route53targets.CloudFrontTarget(this.cloudfront),
      ),
      zone: this.rootHostedZone,
    });
  }

  private setRootDomainName(domainName?: string) {
    if (!domainName) {
      return undefined;
    }

    const [subdomain, ...rest] = domainName.split('.');

    const rootdomain = rest.length > 2 ? rest.join('.') : domainName;

    return rootdomain;
  }

  private requestAcmCertificate() {
    if (!this.rootDomainName || !this.domainName) {
      throw new Error(
        'Can not import hosted zone as rootDomainName is not defined',
      );
    }

    this.rootHostedZone = importHostedZone(
      this.parent,
      this.rootDomainName,
      `${this.appPrefix}RootHz`,
    );

    const certificate = new acm.DnsValidatedCertificate(
      this.parent,
      `${this.appPrefix}WebsiteCertificate`,
      {
        domainName: this.domainName,
        hostedZone: this.rootHostedZone,
        region: 'us-east-1',
      },
    );

    return certificate;
  }

  /** Restricts bucket access to CloudFront user only */
  private createOriginAccessIdentity() {
    const cloudfrontOriginAccessIdentity = new cloudfront.OriginAccessIdentity(
      this.parent,
      `${this.appPrefix}CloudFrontOAI`,
    );

    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [this.bucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
      }),
    );

    return cloudfrontOriginAccessIdentity;
  }

  /** Configures security headers for Cloudfront responses */
  private createResponseHeadersPolicy() {
    return new cloudfront.ResponseHeadersPolicy(
      this.parent,
      `${this.appPrefix}ResponseHeaderPolicy`,
      {
        comment: 'Security headers response header policy',
        securityHeadersBehavior: {
          strictTransportSecurity: {
            override: true,
            accessControlMaxAge: cdk.Duration.days(2 * 365),
            includeSubdomains: true,
            preload: true,
          },
          contentTypeOptions: {
            override: true,
          },
          referrerPolicy: {
            override: true,
            referrerPolicy:
              cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          },
          xssProtection: {
            override: true,
            protection: true,
            modeBlock: true,
          },
          frameOptions: {
            override: true,
            frameOption: cloudfront.HeadersFrameOption.DENY,
          },
        },
      },
    );
  }
}
