import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { load } from 'js-yaml';
import { EnvConfig } from '../config/interface';

/**
 * Gets variable value from CDK context
 *
 * @see: https://docs.aws.amazon.com/cdk/v2/guide/context.html
 *
 * @param {cdk.App} app - CDK application instance
 * @param {string} contextKey - name of the context variable
 *
 * @returns value of the context variable
 */
export const getContextVariable = (
  app: cdk.App,
  contextKey: string,
): string => {
  const contextVar = app.node.tryGetContext(contextKey);
  if (!contextVar)
    throw new Error(
      `Context variable ${contextKey} is missing in CDK command. Pass it as -c ${contextKey}=VALUE`,
    );

  return contextVar;
};

/**
 * Get application config for provided environment
 *
 * @param {cdk.App} app CDK application instance
 *
 * @returns {EnvConfig} appplication environment config
 */
export const getConfig = (app: cdk.App): EnvConfig => {
  const environment = getContextVariable(app, 'env');
  const configFile = `./config/${environment}.yaml`;
  const envConfig = load(
    fs.readFileSync(path.resolve(configFile), 'utf8'),
  ) as EnvConfig;

  if (!envConfig.awsAccountId) {
    throw new Error(`"awsAccountId" is missing in ${configFile}`);
  }

  if (!envConfig.awsRegion) {
    throw new Error(`"awsRegion" is missing in ${configFile}`);
  }

  return {
    ...envConfig,
    environment,
  };
};
