export interface EnvConfig {
  awsAccountId: string;
  awsRegion: string;
  environment: string;
  appPrefix: string;
  app: AppConfig;
}

export interface AppConfig {
  appId: string;
  domainName: string;
  enabled: boolean;
  createCustomDomain: boolean;
}
