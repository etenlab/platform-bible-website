import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { FrontendCloudfront } from '../components';

/** Properties required to create infrastructure for frontend app */
export interface FrontendStackProps extends cdk.StackProps {
  /** Name of the application assigned to logical id of CloudFormation components */
  readonly appPrefix: string;

  /** Name of the deployed environmend */
  readonly envName: string;

  /**
   * Domain name to used to access app.
   * Must be a subdomain of the specified root domain.
   */
  readonly domainName: string;

  /** App ID used to mark AWS resources related to this app */
  readonly appId: string;

  /** Whether Cloudfront is accessible */
  readonly enabled: boolean;

  readonly createCustomDomain: boolean;
}

/**
 * Create frontend infrastructure including:
 *
 * 1. S3 bucket to store application code
 * 2. CloudFront user which can exclusively access bucket content
 * 3. CloudFront distribution to serve application code
 * 4. Route53 record and ACM certificate for application subdomain
 *
 */
export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    /** Private S3 bucket with frontend source code */
    const assetsBucket = new s3.Bucket(
      this,
      `${props.appPrefix}WebsiteBucket`,
      {
        publicReadAccess: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        accessControl: s3.BucketAccessControl.PRIVATE,
        objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
        encryption: s3.BucketEncryption.S3_MANAGED,
      },
    );

    /** Cloudfront distribution */
    const cloudfrontDistribution = new FrontendCloudfront(
      this,
      `${props.appPrefix}Cfn`,
      {
        appPrefix: props.appPrefix,
        bucket: assetsBucket,
        domainName: props.domainName,
        enabled: props.enabled,
        createCustomDomain: props.createCustomDomain,
      },
    ).getDistribution();

    /** Cloudformation outputs */
    new cdk.CfnOutput(this, `${props.appPrefix}BucketName`, {
      exportName: `${props.appId}-bucket-name`,
      value: assetsBucket.bucketName,
    });

    new cdk.CfnOutput(this, `${props.appPrefix}CloudfrontId`, {
      exportName: `${props.appId}-distribution-id`,
      value: cloudfrontDistribution.distributionId,
    });

    new cdk.CfnOutput(this, `${props.appPrefix}DomainName`, {
      exportName: `${props.appId}-domain-name`,
      value: props.domainName,
    });

    new ssm.StringParameter(
      this,
      `${props.appPrefix}${props.appId}DeployParams`,
      {
        parameterName: `/${props.envName}/deploy/${props.domainName}/env`,
        stringValue: `AWS_S3_BUCKET=${assetsBucket.bucketName}\nDISTRIBUTION_ID=${cloudfrontDistribution.distributionId}`,
      },
    );
  }
}
