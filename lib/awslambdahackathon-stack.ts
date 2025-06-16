import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import {
  Table,
  AttributeType,
  BillingMode,
} from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

export class AwslambdahackathonStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    /* 1️⃣  DynamoDB table */
    const itemsTable = new Table(this, 'ItemsTable', {
      partitionKey: { name: 'itemId', type: AttributeType.STRING },
      sortKey:      { name: 'version', type: AttributeType.NUMBER },
      billingMode:  BillingMode.PAY_PER_REQUEST,   // on-demand, no capacity planning
      removalPolicy: RemovalPolicy.DESTROY,        // ← keep DEV easy; change to RETAIN in prod
    });

    /* 2️⃣  Example: give your existing HelloFn (or a new Lambda) access */
    const handler = new NodejsFunction(this, 'HelloFn', {
      entry: 'lambda/hello.ts',
      timeout: Duration.seconds(10),
      environment: {
        ITEMS_TABLE_NAME: itemsTable.tableName,
      },
    });
    itemsTable.grantReadWriteData(handler);

    /* Generator Lambda  */
    const generatorFn = new NodejsFunction(this, 'GeneratorFn', {
      entry: 'lambda/generator.ts',
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        ITEMS_TABLE_NAME: itemsTable.tableName,
        BEDROCK_MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0"  // ← pick your model
      },
    });

    // write permission to DynamoDB
    itemsTable.grantReadWriteData(generatorFn);

    // Bedrock invoke permission
    generatorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`]
    }));

    /* 3️⃣  (unchanged) — API Gateway wired to handler */
    const api = new RestApi(this, 'HelloApi');
    api.root.addMethod('GET', new LambdaIntegration(handler));
    api.root.addResource('generate')
        .addMethod('POST', new LambdaIntegration(generatorFn));
  }
}
