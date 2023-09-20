import { Construct } from 'constructs';
import * as route53 from 'aws-cdk-lib/aws-route53';

export const importHostedZone = (
  scope: Construct,
  domainName: string,
  hzId?: string,
): route53.IHostedZone => {
  const hostedZoneId = hzId || `${domainName}HZ`;

  return route53.HostedZone.fromLookup(scope, hostedZoneId, {
    domainName,
  });
};
