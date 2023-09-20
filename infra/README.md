# platform.bible infra

Project infrastructure written in CDK Typescript.

This project consist of:

- S3 bucket with website contents
- CloudFront distribution

## First-time deployment

1. Configured your AWS CLI with correct credentials. See [AWS CLI Configuration basics](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html) for reference.
2. Bootstrap CDK project in your AWS account if you have not done so already. See [CDK Bootstrapping docs](https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html) for reference.
3. Install project dependencies: `npm ci`.
4. Check environment configuration in `./config/dev.yaml` for developnet environment. Use `./config/prod.yaml` for production.
5. Deploy App stack: `npm run deploy:dev`.

## How to redeploy API stack

Dev: `npm run deploy:dev`
Prod: `npm run deploy:prod`

## Useful commands

- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
- `cdk context --clear` clear values stored in local `cdk.context.json`. Useful if deployment fails with "resource not found" kind of error.
