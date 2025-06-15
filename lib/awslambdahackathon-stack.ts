import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';

export class AwslambdahackathonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunction(this, 'HelloFn', {
      entry: 'lambda/hello.ts',
      timeout: Duration.seconds(10),
    });

    const api = new RestApi(this, 'HelloApi');
    api.root.addMethod('GET', new LambdaIntegration(handler)); // → /
  }
}
