"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwslambdahackathonStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_s3_2 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_stepfunctions_1 = require("aws-cdk-lib/aws-stepfunctions");
const aws_stepfunctions_tasks_1 = require("aws-cdk-lib/aws-stepfunctions-tasks");
class AwslambdahackathonStack extends aws_cdk_lib_1.Stack {
    itemsTable;
    constructor(scope, id, props) {
        super(scope, id, props);
        // Add this helper function somewhere in your stack file:
        function addCorsOptions(apiResource) {
            apiResource.addMethod('OPTIONS', new aws_apigateway_1.MockIntegration({
                integrationResponses: [{
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Headers': "'*'",
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                            'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
                        },
                    }],
                passthroughBehavior: aws_apigateway_1.PassthroughBehavior.NEVER,
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
        this.itemsTable = new aws_dynamodb_1.Table(this, 'ItemsTable', {
            partitionKey: { name: 'itemId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'version', type: aws_dynamodb_1.AttributeType.NUMBER },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        this.itemsTable.addGlobalSecondaryIndex({
            indexName: "StatusIndex",
            partitionKey: { name: "status", type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: "createdAt", type: aws_dynamodb_1.AttributeType.STRING }
        });
        const listPendingFn = new aws_lambda_nodejs_1.NodejsFunction(this, "ListPendingFn", {
            entry: "lambda/listPending.ts",
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            memorySize: 256,
            environment: {
                ITEMS_TABLE_NAME: this.itemsTable.tableName
            }
        });
        this.itemsTable.grantReadData(listPendingFn);
        // 2️⃣ Lambdas
        const handler = new aws_lambda_nodejs_1.NodejsFunction(this, 'HelloFn', {
            entry: 'lambda/hello.ts',
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            environment: {
                ITEMS_TABLE_NAME: this.itemsTable.tableName,
            },
        });
        this.itemsTable.grantReadWriteData(handler);
        const generatorFn = new aws_lambda_nodejs_1.NodejsFunction(this, 'GeneratorFn', {
            entry: 'lambda/generator.ts',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                ITEMS_TABLE_NAME: this.itemsTable.tableName,
                BEDROCK_MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0"
            },
        });
        this.itemsTable.grantReadWriteData(generatorFn);
        // Create the S3 bucket for puzzle images
        const puzzleImagesBucket = new aws_s3_1.Bucket(this, "PuzzleImagesBucket", {
            bucketName: `${this.stackName.toLowerCase()}-puzzle-images`, // change if needed
            publicReadAccess: true, // public-read for demo/dev; use signed URLs in prod!
            blockPublicAccess: new aws_s3_2.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [aws_s3_1.HttpMethods.GET],
                    allowedOrigins: ["*"],
                    allowedHeaders: ["*"],
                },
            ]
        });
        puzzleImagesBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject'],
            resources: [puzzleImagesBucket.arnForObjects('*')],
            principals: [new iam.AnyPrincipal()],
            effect: iam.Effect.ALLOW,
        }));
        // Grant write/upload permissions to the generator Lambda
        puzzleImagesBucket.grantPut(generatorFn); // <-- assuming generatorFn is your image-generating lambda
        // Pass bucket name as an environment variable to the Lambda
        generatorFn.addEnvironment("PUZZLE_IMAGES_BUCKET", puzzleImagesBucket.bucketName);
        generatorFn.addEnvironment("BEDROCK_IMAGE_MODEL_ID", "amazon.titan-image-generator-v1");
        const generatorTask = new aws_stepfunctions_tasks_1.LambdaInvoke(this, 'InvokeGenerator', {
            lambdaFunction: generatorFn,
            payload: aws_stepfunctions_1.TaskInput.fromObject({
                type: aws_stepfunctions_1.JsonPath.stringAt('$.type'),
                lang: aws_stepfunctions_1.JsonPath.stringAt('$.lang'),
            }),
            resultPath: '$.generatorResult',
        });
        const mapState = new aws_stepfunctions_1.Map(this, 'ForEach', {
            itemsPath: '$.items',
            // DO NOT set itemSelector or parameters here!
        }).iterator(generatorTask);
        const stateMachine = new aws_stepfunctions_1.StateMachine(this, 'GeneratorStateMachine', {
            definition: mapState,
            timeout: aws_cdk_lib_1.Duration.minutes(15),
        });
        const reviewerFn = new aws_lambda_nodejs_1.NodejsFunction(this, 'ReviewerFn', {
            entry: 'lambda/reviewer.ts',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(10),
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
        const requestItemsFn = new aws_lambda_nodejs_1.NodejsFunction(this, "RequestItemsFn", {
            entry: 'lambda/requestItems.ts',
            environment: {
                STATE_MACHINE_ARN: stepFn.stateMachineArn,
            },
        });
        stepFn.grantStartExecution(requestItemsFn);
        // 3️⃣ API Gateway
        const api = new aws_apigateway_1.RestApi(this, 'HelloApi');
        api.root.addMethod('GET', new aws_apigateway_1.LambdaIntegration(handler));
        const generateResource = api.root.addResource('generate');
        generateResource.addMethod('POST', new aws_apigateway_1.LambdaIntegration(generatorFn));
        addCorsOptions(generateResource);
        const reviewResource = api.root.addResource('review');
        reviewResource.addMethod('POST', new aws_apigateway_1.LambdaIntegration(reviewerFn));
        addCorsOptions(reviewResource);
        const pendingResource = api.root.addResource('pending');
        pendingResource.addMethod('GET', new aws_apigateway_1.LambdaIntegration(listPendingFn));
        addCorsOptions(pendingResource);
        const requestItemsResource = api.root.addResource('request-items');
        requestItemsResource.addMethod('POST', new aws_apigateway_1.LambdaIntegration(requestItemsFn));
        addCorsOptions(requestItemsResource);
        // 4️⃣ S3 static site bucket
        const siteBucket = new aws_s3_1.Bucket(this, "SiteBucket", {
            websiteIndexDocument: "index.html",
            publicReadAccess: true,
            blockPublicAccess: new aws_s3_2.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // Optional: add CORS for S3 if needed for web fonts/images
        siteBucket.addCorsRule({
            allowedMethods: [aws_s3_1.HttpMethods.GET],
            allowedOrigins: ["*"],
            allowedHeaders: ["*"],
        });
        // 5️⃣ CloudFront distribution for SPA
        const oai = new aws_cloudfront_1.OriginAccessIdentity(this, "SiteOAI");
        siteBucket.grantRead(oai);
        const cf = new aws_cloudfront_1.Distribution(this, "SiteDistribution", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.S3Origin(siteBucket, { originAccessIdentity: oai }),
                viewerProtocolPolicy: aws_cloudfront_1.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    ttl: aws_cdk_lib_1.Duration.minutes(5),
                },
                {
                    httpStatus: 404,
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                    ttl: aws_cdk_lib_1.Duration.minutes(5),
                }
            ],
        });
        // 6️⃣ Deploy React build to S3 and invalidate CloudFront
        new aws_s3_deployment_1.BucketDeployment(this, "DeployWebsite", {
            sources: [aws_s3_deployment_1.Source.asset("frontend/build")], // <-- update to your React build output dir
            destinationBucket: siteBucket,
            distribution: cf,
            distributionPaths: ["/*"],
        });
        // 7️⃣ Output website URL for your convenience
        new aws_cdk_lib_2.CfnOutput(this, "SiteURL", {
            value: "https://" + cf.domainName,
            description: "The CloudFront URL of the React review UI"
        });
    }
}
exports.AwslambdahackathonStack = AwslambdahackathonStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQXlFO0FBRXpFLHFFQUErRDtBQUMvRCwrREFFMkQ7QUFDM0QsMkRBSWtDO0FBQ2xDLHlEQUEyQztBQUMzQyx1REFBaUQ7QUFDakQsK0NBQThFO0FBQzlFLCtDQUF1RDtBQUN2RCwrREFBc0c7QUFDdEcsK0VBQThEO0FBQzlELHFFQUF5RTtBQUN6RSw2Q0FBd0M7QUFDeEMscUVBQTZGO0FBQzdGLGlGQUFtRTtBQUduRSxNQUFhLHVCQUF3QixTQUFRLG1CQUFLO0lBQ2hDLFVBQVUsQ0FBUTtJQUNsQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHlEQUF5RDtRQUN6RCxTQUFTLGNBQWMsQ0FBQyxXQUFxQjtZQUMzQyxXQUFXLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxJQUFJLGdDQUFlLENBQUM7Z0JBQ25ELG9CQUFvQixFQUFFLENBQUM7d0JBQ3JCLFVBQVUsRUFBRSxLQUFLO3dCQUNqQixrQkFBa0IsRUFBRTs0QkFDbEIscURBQXFELEVBQUUsS0FBSzs0QkFDNUQsb0RBQW9ELEVBQUUsS0FBSzs0QkFDM0QscURBQXFELEVBQUUsK0JBQStCO3lCQUN2RjtxQkFDRixDQUFDO2dCQUNGLG1CQUFtQixFQUFFLG9DQUFtQixDQUFDLEtBQUs7Z0JBQzlDLGdCQUFnQixFQUFFO29CQUNoQixrQkFBa0IsRUFBRSx1QkFBdUI7aUJBQzVDO2FBQ0YsQ0FBQyxFQUFFO2dCQUNGLGVBQWUsRUFBRSxDQUFDO3dCQUNoQixVQUFVLEVBQUUsS0FBSzt3QkFDakIsa0JBQWtCLEVBQUU7NEJBQ2xCLHFEQUFxRCxF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QW9CLEVBQUUscUNBQW9CLENBQUMsaUJBQWlCO2FBQzdEO1lBQ0QsY0FBYyxFQUFFO2dCQUNkO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3pCO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3pCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx5REFBeUQ7UUFDekQsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzFDLE9BQU8sRUFBRSxDQUFDLDBCQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSw0Q0FBNEM7WUFDdkYsaUJBQWlCLEVBQUUsVUFBVTtZQUM3QixZQUFZLEVBQUUsRUFBRTtZQUNoQixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztTQUMxQixDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSx1QkFBUyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDN0IsS0FBSyxFQUFFLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVTtZQUNqQyxXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJQRCwwREFxUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcywgRHVyYXRpb24sIFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24sIFJlc3RBcGksIFJlc291cmNlLFxuICBNb2NrSW50ZWdyYXRpb24sXG4gIFBhc3N0aHJvdWdoQmVoYXZpb3IgIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0IHtcbiAgVGFibGUsXG4gIEF0dHJpYnV0ZVR5cGUsXG4gIEJpbGxpbmdNb2RlLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQnVja2V0LCBCdWNrZXRBY2Nlc3NDb250cm9sLCBIdHRwTWV0aG9kcyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IERpc3RyaWJ1dGlvbiwgT3JpZ2luQWNjZXNzSWRlbnRpdHksIFZpZXdlclByb3RvY29sUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHsgUzNPcmlnaW4gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCB7IEJ1Y2tldERlcGxveW1lbnQsIFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IENmbk91dHB1dCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFN0YXRlTWFjaGluZSwgUGFzcywgVGFza0lucHV0LCBNYXAsIEpzb25QYXRoIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0IHsgTGFtYmRhSW52b2tlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBBd3NsYW1iZGFoYWNrYXRob25TdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGl0ZW1zVGFibGU6IFRhYmxlO1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIEFkZCB0aGlzIGhlbHBlciBmdW5jdGlvbiBzb21ld2hlcmUgaW4geW91ciBzdGFjayBmaWxlOlxuICAgIGZ1bmN0aW9uIGFkZENvcnNPcHRpb25zKGFwaVJlc291cmNlOiBSZXNvdXJjZSkge1xuICAgICAgYXBpUmVzb3VyY2UuYWRkTWV0aG9kKCdPUFRJT05TJywgbmV3IE1vY2tJbnRlZ3JhdGlvbih7XG4gICAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJyonXCIsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ09QVElPTlMsR0VULFBVVCxQT1NULERFTEVURSdcIixcbiAgICAgICAgICB9LFxuICAgICAgICB9XSxcbiAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogUGFzc3Rocm91Z2hCZWhhdmlvci5ORVZFUixcbiAgICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xuICAgICAgICAgIFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1cIlxuICAgICAgICB9XG4gICAgICB9KSwge1xuICAgICAgICBtZXRob2RSZXNwb25zZXM6IFt7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9XVxuICAgICAgfSk7XG4gICAgfVxuXG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZVxuXG4gICAgdGhpcy5pdGVtc1RhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdJdGVtc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpdGVtSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogICAgICB7IG5hbWU6ICd2ZXJzaW9uJywgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiAgQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgdGhpcy5pdGVtc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogXCJTdGF0dXNJbmRleFwiLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwic3RhdHVzXCIsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6IFwiY3JlYXRlZEF0XCIsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGxpc3RQZW5kaW5nRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgXCJMaXN0UGVuZGluZ0ZuXCIsIHtcbiAgICAgIGVudHJ5OiBcImxhbWJkYS9saXN0UGVuZGluZy50c1wiLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgSVRFTVNfVEFCTEVfTkFNRTogdGhpcy5pdGVtc1RhYmxlLnRhYmxlTmFtZVxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuaXRlbXNUYWJsZS5ncmFudFJlYWREYXRhKGxpc3RQZW5kaW5nRm4pO1xuXG4gICAgLy8gMu+4j+KDoyBMYW1iZGFzXG4gICAgY29uc3QgaGFuZGxlciA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnSGVsbG9GbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2hlbGxvLnRzJyxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgSVRFTVNfVEFCTEVfTkFNRTogdGhpcy5pdGVtc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdGhpcy5pdGVtc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShoYW5kbGVyKTtcblxuICAgIGNvbnN0IGdlbmVyYXRvckZuID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZW5lcmF0b3JGbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2dlbmVyYXRvci50cycsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBJVEVNU19UQUJMRV9OQU1FOiB0aGlzLml0ZW1zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MFwiXG4gICAgICB9LFxuICAgIH0pO1xuICAgIHRoaXMuaXRlbXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdG9yRm4pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBTMyBidWNrZXQgZm9yIHB1enpsZSBpbWFnZXNcbiAgICBjb25zdCBwdXp6bGVJbWFnZXNCdWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsIFwiUHV6emxlSW1hZ2VzQnVja2V0XCIsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lLnRvTG93ZXJDYXNlKCl9LXB1enpsZS1pbWFnZXNgLCAvLyBjaGFuZ2UgaWYgbmVlZGVkXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLCAvLyBwdWJsaWMtcmVhZCBmb3IgZGVtby9kZXY7IHVzZSBzaWduZWQgVVJMcyBpbiBwcm9kIVxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBCbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgIGJsb2NrUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIGJsb2NrUHVibGljUG9saWN5OiBmYWxzZSxcbiAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIHJlc3RyaWN0UHVibGljQnVja2V0czogZmFsc2UsXG4gICAgICB9KSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtIdHRwTWV0aG9kcy5HRVRdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXCIqXCJdLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgcHV6emxlSW1hZ2VzQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICAgIHJlc291cmNlczogW3B1enpsZUltYWdlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIH0pXG4gICAgKTtcblxuLy8gR3JhbnQgd3JpdGUvdXBsb2FkIHBlcm1pc3Npb25zIHRvIHRoZSBnZW5lcmF0b3IgTGFtYmRhXG4gICAgcHV6emxlSW1hZ2VzQnVja2V0LmdyYW50UHV0KGdlbmVyYXRvckZuKTsgLy8gPC0tIGFzc3VtaW5nIGdlbmVyYXRvckZuIGlzIHlvdXIgaW1hZ2UtZ2VuZXJhdGluZyBsYW1iZGFcblxuLy8gUGFzcyBidWNrZXQgbmFtZSBhcyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byB0aGUgTGFtYmRhXG4gICAgZ2VuZXJhdG9yRm4uYWRkRW52aXJvbm1lbnQoXCJQVVpaTEVfSU1BR0VTX0JVQ0tFVFwiLCBwdXp6bGVJbWFnZXNCdWNrZXQuYnVja2V0TmFtZSk7XG4gICAgZ2VuZXJhdG9yRm4uYWRkRW52aXJvbm1lbnQoXCJCRURST0NLX0lNQUdFX01PREVMX0lEXCIsIFwiYW1hem9uLnRpdGFuLWltYWdlLWdlbmVyYXRvci12MVwiKTtcblxuXG4gICAgY29uc3QgZ2VuZXJhdG9yVGFzayA9IG5ldyBMYW1iZGFJbnZva2UodGhpcywgJ0ludm9rZUdlbmVyYXRvcicsIHtcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0b3JGbixcbiAgICAgIHBheWxvYWQ6IFRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgdHlwZTogSnNvblBhdGguc3RyaW5nQXQoJyQudHlwZScpLFxuICAgICAgICBsYW5nOiBKc29uUGF0aC5zdHJpbmdBdCgnJC5sYW5nJyksXG4gICAgICB9KSxcbiAgICAgIHJlc3VsdFBhdGg6ICckLmdlbmVyYXRvclJlc3VsdCcsXG4gICAgfSk7XG5cbiAgICBjb25zdCBtYXBTdGF0ZSA9IG5ldyBNYXAodGhpcywgJ0ZvckVhY2gnLCB7XG4gICAgICBpdGVtc1BhdGg6ICckLml0ZW1zJyxcbiAgICAgIC8vIERPIE5PVCBzZXQgaXRlbVNlbGVjdG9yIG9yIHBhcmFtZXRlcnMgaGVyZSFcbiAgICB9KS5pdGVyYXRvcihnZW5lcmF0b3JUYXNrKTtcblxuICAgIGNvbnN0IHN0YXRlTWFjaGluZSA9IG5ldyBTdGF0ZU1hY2hpbmUodGhpcywgJ0dlbmVyYXRvclN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IG1hcFN0YXRlLFxuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygxNSksXG4gICAgfSk7XG5cblxuICAgIGNvbnN0IHJldmlld2VyRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1Jldmlld2VyRm4nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9yZXZpZXdlci50cycsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBJVEVNU19UQUJMRV9OQU1FOiB0aGlzLml0ZW1zVGFibGUudGFibGVOYW1lLFxuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuaXRlbXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmV2aWV3ZXJGbik7XG5cbiAgICBnZW5lcmF0b3JGbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJywgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nXSxcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmJlZHJvY2s6JHt0aGlzLnJlZ2lvbn06OmZvdW5kYXRpb24tbW9kZWwvKmBdXG4gICAgfSkpO1xuXG4gICAgLy8gQXNzdW1lIHlvdSBoYXZlIGFscmVhZHkgZGVmaW5lZCB5b3VyIFN0YXRlTWFjaGluZSAoc2VlIGJlbG93KVxuICAgIGNvbnN0IHN0ZXBGbiA9IHN0YXRlTWFjaGluZTtcblxuICAgIGNvbnN0IHJlcXVlc3RJdGVtc0ZuID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsIFwiUmVxdWVzdEl0ZW1zRm5cIiwge1xuICAgICAgZW50cnk6ICdsYW1iZGEvcmVxdWVzdEl0ZW1zLnRzJyxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFNUQVRFX01BQ0hJTkVfQVJOOiBzdGVwRm4uc3RhdGVNYWNoaW5lQXJuLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIHN0ZXBGbi5ncmFudFN0YXJ0RXhlY3V0aW9uKHJlcXVlc3RJdGVtc0ZuKTtcblxuICAgIC8vIDPvuI/ig6MgQVBJIEdhdGV3YXlcbiAgICBjb25zdCBhcGkgPSBuZXcgUmVzdEFwaSh0aGlzLCAnSGVsbG9BcGknKTtcbiAgICBhcGkucm9vdC5hZGRNZXRob2QoJ0dFVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihoYW5kbGVyKSk7XG4gICAgY29uc3QgZ2VuZXJhdGVSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdnZW5lcmF0ZScpO1xuICAgIGdlbmVyYXRlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IExhbWJkYUludGVncmF0aW9uKGdlbmVyYXRvckZuKSk7XG4gICAgYWRkQ29yc09wdGlvbnMoZ2VuZXJhdGVSZXNvdXJjZSk7XG4gICAgY29uc3QgcmV2aWV3UmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmV2aWV3Jyk7XG4gICAgcmV2aWV3UmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IExhbWJkYUludGVncmF0aW9uKHJldmlld2VyRm4pKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhyZXZpZXdSZXNvdXJjZSk7XG4gICAgY29uc3QgcGVuZGluZ1Jlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3BlbmRpbmcnKTtcbiAgICBwZW5kaW5nUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgTGFtYmRhSW50ZWdyYXRpb24obGlzdFBlbmRpbmdGbikpO1xuICAgIGFkZENvcnNPcHRpb25zKHBlbmRpbmdSZXNvdXJjZSk7XG4gICAgY29uc3QgcmVxdWVzdEl0ZW1zUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncmVxdWVzdC1pdGVtcycpO1xuICAgIHJlcXVlc3RJdGVtc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihyZXF1ZXN0SXRlbXNGbikpO1xuICAgIGFkZENvcnNPcHRpb25zKHJlcXVlc3RJdGVtc1Jlc291cmNlKTtcblxuXG4gICAgLy8gNO+4j+KDoyBTMyBzdGF0aWMgc2l0ZSBidWNrZXRcbiAgICBjb25zdCBzaXRlQnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCBcIlNpdGVCdWNrZXRcIiwge1xuICAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6IFwiaW5kZXguaHRtbFwiLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBuZXcgQmxvY2tQdWJsaWNBY2Nlc3Moe1xuICAgICAgICBibG9ja1B1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICBibG9ja1B1YmxpY1BvbGljeTogZmFsc2UsXG4gICAgICAgIGlnbm9yZVB1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICByZXN0cmljdFB1YmxpY0J1Y2tldHM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIE9wdGlvbmFsOiBhZGQgQ09SUyBmb3IgUzMgaWYgbmVlZGVkIGZvciB3ZWIgZm9udHMvaW1hZ2VzXG4gICAgc2l0ZUJ1Y2tldC5hZGRDb3JzUnVsZSh7XG4gICAgICBhbGxvd2VkTWV0aG9kczogW0h0dHBNZXRob2RzLkdFVF0sXG4gICAgICBhbGxvd2VkT3JpZ2luczogW1wiKlwiXSxcbiAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgIH0pO1xuXG4gICAgLy8gNe+4j+KDoyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgU1BBXG4gICAgY29uc3Qgb2FpID0gbmV3IE9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsIFwiU2l0ZU9BSVwiKTtcbiAgICBzaXRlQnVja2V0LmdyYW50UmVhZChvYWkpO1xuXG4gICAgY29uc3QgY2YgPSBuZXcgRGlzdHJpYnV0aW9uKHRoaXMsIFwiU2l0ZURpc3RyaWJ1dGlvblwiLCB7XG4gICAgICBkZWZhdWx0Um9vdE9iamVjdDogXCJpbmRleC5odG1sXCIsXG4gICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgb3JpZ2luOiBuZXcgUzNPcmlnaW4oc2l0ZUJ1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eTogb2FpIH0pLFxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICB9LFxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiBcIi9pbmRleC5odG1sXCIsXG4gICAgICAgICAgdHRsOiBEdXJhdGlvbi5taW51dGVzKDUpLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgICB0dGw6IER1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH1cbiAgICAgIF0sXG4gICAgfSk7XG5cbiAgICAvLyA277iP4oOjIERlcGxveSBSZWFjdCBidWlsZCB0byBTMyBhbmQgaW52YWxpZGF0ZSBDbG91ZEZyb250XG4gICAgbmV3IEJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJEZXBsb3lXZWJzaXRlXCIsIHtcbiAgICAgIHNvdXJjZXM6IFtTb3VyY2UuYXNzZXQoXCJmcm9udGVuZC9idWlsZFwiKV0sIC8vIDwtLSB1cGRhdGUgdG8geW91ciBSZWFjdCBidWlsZCBvdXRwdXQgZGlyXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogc2l0ZUJ1Y2tldCxcbiAgICAgIGRpc3RyaWJ1dGlvbjogY2YsXG4gICAgICBkaXN0cmlidXRpb25QYXRoczogW1wiLypcIl0sXG4gICAgfSk7XG5cbiAgICAvLyA377iP4oOjIE91dHB1dCB3ZWJzaXRlIFVSTCBmb3IgeW91ciBjb252ZW5pZW5jZVxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgXCJTaXRlVVJMXCIsIHtcbiAgICAgIHZhbHVlOiBcImh0dHBzOi8vXCIgKyBjZi5kb21haW5OYW1lLFxuICAgICAgZGVzY3JpcHRpb246IFwiVGhlIENsb3VkRnJvbnQgVVJMIG9mIHRoZSBSZWFjdCByZXZpZXcgVUlcIlxuICAgIH0pO1xuICB9XG59XG4iXX0=