import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LambdaIntegration, RestApi, Resource,
  MockIntegration,
  PassthroughBehavior  } from 'aws-cdk-lib/aws-apigateway';
import {
  Table,
  AttributeType,
  BillingMode,
} from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, BucketAccessControl, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput } from 'aws-cdk-lib';
import { StateMachine, Pass, TaskInput, Map, JsonPath } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';


export class AwslambdahackathonStack extends Stack {
  public readonly itemsTable: Table;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Add this helper function somewhere in your stack file:
    function addCorsOptions(apiResource: Resource) {
      apiResource.addMethod('OPTIONS', new MockIntegration({
        integrationResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': "'*'",
            'method.response.header.Access-Control-Allow-Origin': "'*'",
            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
          },
        }],
        passthroughBehavior: PassthroughBehavior.NEVER,
        requestTemplates: {
          "application/json": "{\"statusCode\": 200}"
        }
      }), {
        methodResponses: [{
          statusCode: '200',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Headers': true,
            'method.response.header.Access-Control-Allow-Methods': true,
            'method.response.header.Access-Control-Allow-Origin': true,
          },
        }]
      });
    }


    // DynamoDB table

    this.itemsTable = new Table(this, 'ItemsTable', {
      partitionKey: { name: 'itemId', type: AttributeType.STRING },
      sortKey:      { name: 'version', type: AttributeType.NUMBER },
      billingMode:  BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.itemsTable.addGlobalSecondaryIndex({
      indexName: "StatusIndex",
      partitionKey: { name: "status", type: AttributeType.STRING },
      sortKey: { name: "createdAt", type: AttributeType.STRING }
    });

    const listPendingFn = new NodejsFunction(this, "ListPendingFn", {
      entry: "lambda/listPending.ts",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName
      }
    });
    this.itemsTable.grantReadData(listPendingFn);

    // 2️⃣ Lambdas
    const handler = new NodejsFunction(this, 'HelloFn', {
      entry: 'lambda/hello.ts',
      timeout: Duration.seconds(10),
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName,
      },
    });
    this.itemsTable.grantReadWriteData(handler);

    const generatorFn = new NodejsFunction(this, 'GeneratorFn', {
      entry: 'lambda/generator.ts',
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 512,
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName,
        BEDROCK_MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0"
      },
    });
    this.itemsTable.grantReadWriteData(generatorFn);

    // Create the S3 bucket for puzzle images
    const puzzleImagesBucket = new Bucket(this, "PuzzleImagesBucket", {
      bucketName: `${this.stackName.toLowerCase()}-puzzle-images`, // change if needed
      publicReadAccess: true, // public-read for demo/dev; use signed URLs in prod!
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [HttpMethods.GET],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ]
    });

    puzzleImagesBucket.addToResourcePolicy(
        new iam.PolicyStatement({
          actions: ['s3:GetObject'],
          resources: [puzzleImagesBucket.arnForObjects('*')],
          principals: [new iam.AnyPrincipal()],
          effect: iam.Effect.ALLOW,
        })
    );

// Grant write/upload permissions to the generator Lambda
    puzzleImagesBucket.grantPut(generatorFn); // <-- assuming generatorFn is your image-generating lambda

// Pass bucket name as an environment variable to the Lambda
    generatorFn.addEnvironment("PUZZLE_IMAGES_BUCKET", puzzleImagesBucket.bucketName);
    generatorFn.addEnvironment("BEDROCK_IMAGE_MODEL_ID", "amazon.titan-image-generator-v1");


    const generatorTask = new LambdaInvoke(this, 'InvokeGenerator', {
      lambdaFunction: generatorFn,
      payload: TaskInput.fromObject({
        type: JsonPath.stringAt('$.type'),
        lang: JsonPath.stringAt('$.lang'),
      }),
      resultPath: '$.generatorResult',
    });

    const mapState = new Map(this, 'ForEach', {
      itemsPath: '$.items',
      // DO NOT set itemSelector or parameters here!
    }).iterator(generatorTask);

    const stateMachine = new StateMachine(this, 'GeneratorStateMachine', {
      definition: mapState,
      timeout: Duration.minutes(15),
    });


    const reviewerFn = new NodejsFunction(this, 'ReviewerFn', {
      entry: 'lambda/reviewer.ts',
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      memorySize: 256,
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName,
      }
    });
    this.itemsTable.grantReadWriteData(reviewerFn);

    generatorFn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`]
    }));

    // Assume you have already defined your StateMachine (see below)
    const stepFn = stateMachine;

    const requestItemsFn = new NodejsFunction(this, "RequestItemsFn", {
      entry: 'lambda/requestItems.ts',
      environment: {
        STATE_MACHINE_ARN: stepFn.stateMachineArn,
      },
    });

    stepFn.grantStartExecution(requestItemsFn);

    // 3️⃣ API Gateway
    const api = new RestApi(this, 'HelloApi');
    api.root.addMethod('GET', new LambdaIntegration(handler));
    const generateResource = api.root.addResource('generate');
    generateResource.addMethod('POST', new LambdaIntegration(generatorFn));
    addCorsOptions(generateResource);
    const reviewResource = api.root.addResource('review');
    reviewResource.addMethod('POST', new LambdaIntegration(reviewerFn));
    addCorsOptions(reviewResource);
    const pendingResource = api.root.addResource('pending');
    pendingResource.addMethod('GET', new LambdaIntegration(listPendingFn));
    addCorsOptions(pendingResource);
    const requestItemsResource = api.root.addResource('request-items');
    requestItemsResource.addMethod('POST', new LambdaIntegration(requestItemsFn));
    addCorsOptions(requestItemsResource);


    // 4️⃣ S3 static site bucket
    const siteBucket = new Bucket(this, "SiteBucket", {
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      blockPublicAccess: new BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Optional: add CORS for S3 if needed for web fonts/images
    siteBucket.addCorsRule({
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
    });

    // 5️⃣ CloudFront distribution for SPA
    const oai = new OriginAccessIdentity(this, "SiteOAI");
    siteBucket.grantRead(oai);

    const cf = new Distribution(this, "SiteDistribution", {
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: new S3Origin(siteBucket, { originAccessIdentity: oai }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(5),
        }
      ],
    });

    // 6️⃣ Deploy React build to S3 and invalidate CloudFront
    new BucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("frontend/build")], // <-- update to your React build output dir
      destinationBucket: siteBucket,
      distribution: cf,
      distributionPaths: ["/*"],
    });

    // 7️⃣ Output website URL for your convenience
    new CfnOutput(this, "SiteURL", {
      value: "https://" + cf.domainName,
      description: "The CloudFront URL of the React review UI"
    });
  }
}
