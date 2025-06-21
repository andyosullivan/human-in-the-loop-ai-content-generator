import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  LambdaIntegration,
  RestApi,
  Resource,
  MockIntegration,
  PassthroughBehavior,
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from 'aws-cdk-lib/aws-apigateway';
import {
  Table,
  AttributeType,
  BillingMode,
} from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { CfnOutput } from 'aws-cdk-lib';
import { StateMachine, Map, JsonPath, TaskInput } from 'aws-cdk-lib/aws-stepfunctions';
import { LambdaInvoke } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as cognito from 'aws-cdk-lib/aws-cognito';

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

    // --- Cognito User Pool for Admin Auth ---
    const userPool = new cognito.UserPool(this, "AdminUserPool", {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const userPoolClient = new cognito.UserPoolClient(this, "AdminUserPoolClient", {
      userPool,
      generateSecret: false,
    });

    // --- API Gateway ---
    const api = new RestApi(this, 'HelloApi');

    // Cognito Authorizer for protected admin endpoints
    const authorizer = new CognitoUserPoolsAuthorizer(this, "CognitoAuthorizer", {
      cognitoUserPools: [userPool]
    });

    // Lambdas as before
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

    puzzleImagesBucket.grantPut(generatorFn);

    generatorFn.addEnvironment("PUZZLE_IMAGES_BUCKET", puzzleImagesBucket.bucketName);
    generatorFn.addEnvironment("BEDROCK_IMAGE_MODEL_ID", "amazon.titan-image-generator-v1");

    // Step Functions for bulk generation
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

    const stepFn = stateMachine;

    const requestItemsFn = new NodejsFunction(this, "RequestItemsFn", {
      entry: 'lambda/requestItems.ts',
      environment: {
        STATE_MACHINE_ARN: stepFn.stateMachineArn,
      },
    });

    stepFn.grantStartExecution(requestItemsFn);

    const itemStatsFn = new NodejsFunction(this, "ItemStatsFn", {
      entry: "lambda/itemStats.ts",
      environment: {
        ITEMS_TABLE_NAME: this.itemsTable.tableName,
      },
    });
    this.itemsTable.grantReadData(itemStatsFn);

    // --- API endpoints ---

    // PROTECTED ADMIN ENDPOINTS (require Cognito JWT)
    function protect(resource: Resource, lambda: NodejsFunction, method: string = "POST") {
      resource.addMethod(method, new LambdaIntegration(lambda), {
        authorizer,
        authorizationType: AuthorizationType.COGNITO
      });
      addCorsOptions(resource);
    }

    const generateResource = api.root.addResource('generate');
    generateResource.addMethod('POST', new LambdaIntegration(generatorFn)); // Public (if you want)
    addCorsOptions(generateResource);

    const reviewResource = api.root.addResource('review');
    protect(reviewResource, reviewerFn, "POST");

    const pendingResource = api.root.addResource('pending');
    protect(pendingResource, listPendingFn, "GET");

    const requestItemsResource = api.root.addResource('request-items');
    protect(requestItemsResource, requestItemsFn, "POST");

    const itemStatsResource = api.root.addResource('item-stats');
    protect(itemStatsResource, itemStatsFn, "GET");

    // --- S3 static site bucket ---
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

    siteBucket.addCorsRule({
      allowedMethods: [HttpMethods.GET],
      allowedOrigins: ["*"],
      allowedHeaders: ["*"],
    });

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

    new BucketDeployment(this, "DeployWebsite", {
      sources: [Source.asset("frontend/build")],
      destinationBucket: siteBucket,
      distribution: cf,
      distributionPaths: ["/*"],
    });

    new CfnOutput(this, "SiteURL", {
      value: "https://" + cf.domainName,
      description: "The CloudFront URL of the React review UI"
    });

    // --- Cognito outputs for frontend ---
    new CfnOutput(this, "CognitoUserPoolId", { value: userPool.userPoolId });
    new CfnOutput(this, "CognitoUserPoolClientId", { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, "ApiUrl", { value: api.url });
  }
}
