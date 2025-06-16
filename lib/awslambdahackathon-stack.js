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
        // 1️⃣ DynamoDB table
        const itemsTable = new aws_dynamodb_1.Table(this, 'ItemsTable', {
            partitionKey: { name: 'itemId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'version', type: aws_dynamodb_1.AttributeType.NUMBER },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        itemsTable.addGlobalSecondaryIndex({
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
                ITEMS_TABLE_NAME: itemsTable.tableName
            }
        });
        itemsTable.grantReadData(listPendingFn);
        // 2️⃣ Lambdas
        const handler = new aws_lambda_nodejs_1.NodejsFunction(this, 'HelloFn', {
            entry: 'lambda/hello.ts',
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName,
            },
        });
        itemsTable.grantReadWriteData(handler);
        const generatorFn = new aws_lambda_nodejs_1.NodejsFunction(this, 'GeneratorFn', {
            entry: 'lambda/generator.ts',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName,
                BEDROCK_MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0"
            },
        });
        itemsTable.grantReadWriteData(generatorFn);
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
                ITEMS_TABLE_NAME: itemsTable.tableName,
            }
        });
        itemsTable.grantReadWriteData(reviewerFn);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQXlFO0FBRXpFLHFFQUErRDtBQUMvRCwrREFFMkQ7QUFDM0QsMkRBSWtDO0FBQ2xDLHlEQUEyQztBQUMzQyx1REFBaUQ7QUFDakQsK0NBQThFO0FBQzlFLCtDQUF1RDtBQUN2RCwrREFBc0c7QUFDdEcsK0VBQThEO0FBQzlELHFFQUF5RTtBQUN6RSw2Q0FBd0M7QUFDeEMscUVBQTZGO0FBQzdGLGlGQUFtRTtBQUduRSxNQUFhLHVCQUF3QixTQUFRLG1CQUFLO0lBQ2hELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDMUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseURBQXlEO1FBQ3pELFNBQVMsY0FBYyxDQUFDLFdBQXFCO1lBQzNDLFdBQVcsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLElBQUksZ0NBQWUsQ0FBQztnQkFDbkQsb0JBQW9CLEVBQUUsQ0FBQzt3QkFDckIsVUFBVSxFQUFFLEtBQUs7d0JBQ2pCLGtCQUFrQixFQUFFOzRCQUNsQixxREFBcUQsRUFBRSxLQUFLOzRCQUM1RCxvREFBb0QsRUFBRSxLQUFLOzRCQUMzRCxxREFBcUQsRUFBRSwrQkFBK0I7eUJBQ3ZGO3FCQUNGLENBQUM7Z0JBQ0YsbUJBQW1CLEVBQUUsb0NBQW1CLENBQUMsS0FBSztnQkFDOUMsZ0JBQWdCLEVBQUU7b0JBQ2hCLGtCQUFrQixFQUFFLHVCQUF1QjtpQkFDNUM7YUFDRixDQUFDLEVBQUU7Z0JBQ0YsZUFBZSxFQUFFLENBQUM7d0JBQ2hCLFVBQVUsRUFBRSxLQUFLO3dCQUNqQixrQkFBa0IsRUFBRTs0QkFDbEIscURBQXFELEVBQUUsSUFBSTs0QkFDM0Qs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QixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3pCO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ3pCO2FBQ0Y7U0FDRixDQUFDLENBQUM7UUFFSCx5REFBeUQ7UUFDekQsSUFBSSxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzFDLE9BQU8sRUFBRSxDQUFDLDBCQUFNLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsRUFBRSw0Q0FBNEM7WUFDdkYsaUJBQWlCLEVBQUUsVUFBVTtZQUM3QixZQUFZLEVBQUUsRUFBRTtZQUNoQixpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQztTQUMxQixDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSx1QkFBUyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDN0IsS0FBSyxFQUFFLFVBQVUsR0FBRyxFQUFFLENBQUMsVUFBVTtZQUNqQyxXQUFXLEVBQUUsMkNBQTJDO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQW5QRCwwREFtUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcywgRHVyYXRpb24sIFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24sIFJlc3RBcGksIFJlc291cmNlLFxuICBNb2NrSW50ZWdyYXRpb24sXG4gIFBhc3N0aHJvdWdoQmVoYXZpb3IgIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0IHtcbiAgVGFibGUsXG4gIEF0dHJpYnV0ZVR5cGUsXG4gIEJpbGxpbmdNb2RlLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgQnVja2V0LCBCdWNrZXRBY2Nlc3NDb250cm9sLCBIdHRwTWV0aG9kcyB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IERpc3RyaWJ1dGlvbiwgT3JpZ2luQWNjZXNzSWRlbnRpdHksIFZpZXdlclByb3RvY29sUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xuaW1wb3J0IHsgUzNPcmlnaW4gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcbmltcG9ydCB7IEJ1Y2tldERlcGxveW1lbnQsIFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1kZXBsb3ltZW50JztcbmltcG9ydCB7IENmbk91dHB1dCB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IFN0YXRlTWFjaGluZSwgUGFzcywgVGFza0lucHV0LCBNYXAsIEpzb25QYXRoIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xuaW1wb3J0IHsgTGFtYmRhSW52b2tlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xuXG5cbmV4cG9ydCBjbGFzcyBBd3NsYW1iZGFoYWNrYXRob25TdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBBZGQgdGhpcyBoZWxwZXIgZnVuY3Rpb24gc29tZXdoZXJlIGluIHlvdXIgc3RhY2sgZmlsZTpcbiAgICBmdW5jdGlvbiBhZGRDb3JzT3B0aW9ucyhhcGlSZXNvdXJjZTogUmVzb3VyY2UpIHtcbiAgICAgIGFwaVJlc291cmNlLmFkZE1ldGhvZCgnT1BUSU9OUycsIG5ldyBNb2NrSW50ZWdyYXRpb24oe1xuICAgICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiBcIicqJ1wiLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiBcIidPUFRJT05TLEdFVCxQVVQsUE9TVCxERUxFVEUnXCIsXG4gICAgICAgICAgfSxcbiAgICAgICAgfV0sXG4gICAgICAgIHBhc3N0aHJvdWdoQmVoYXZpb3I6IFBhc3N0aHJvdWdoQmVoYXZpb3IuTkVWRVIsXG4gICAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcbiAgICAgICAgICBcImFwcGxpY2F0aW9uL2pzb25cIjogXCJ7XFxcInN0YXR1c0NvZGVcXFwiOiAyMDB9XCJcbiAgICAgICAgfVxuICAgICAgfSksIHtcbiAgICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xuICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IHRydWUsXG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogdHJ1ZSxcbiAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgfV1cbiAgICAgIH0pO1xuICAgIH1cblxuXG4gICAgLy8gMe+4j+KDoyBEeW5hbW9EQiB0YWJsZVxuICAgIGNvbnN0IGl0ZW1zVGFibGUgPSBuZXcgVGFibGUodGhpcywgJ0l0ZW1zVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2l0ZW1JZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiAgICAgIHsgbmFtZTogJ3ZlcnNpb24nLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgICAgYmlsbGluZ01vZGU6ICBCaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgfSk7XG5cbiAgICBpdGVtc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcbiAgICAgIGluZGV4TmFtZTogXCJTdGF0dXNJbmRleFwiLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IFwic3RhdHVzXCIsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6IFwiY3JlYXRlZEF0XCIsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGxpc3RQZW5kaW5nRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgXCJMaXN0UGVuZGluZ0ZuXCIsIHtcbiAgICAgIGVudHJ5OiBcImxhbWJkYS9saXN0UGVuZGluZy50c1wiLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgSVRFTVNfVEFCTEVfTkFNRTogaXRlbXNUYWJsZS50YWJsZU5hbWVcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpdGVtc1RhYmxlLmdyYW50UmVhZERhdGEobGlzdFBlbmRpbmdGbik7XG5cbiAgICAvLyAy77iP4oOjIExhbWJkYXNcbiAgICBjb25zdCBoYW5kbGVyID0gbmV3IE5vZGVqc0Z1bmN0aW9uKHRoaXMsICdIZWxsb0ZuJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvaGVsbG8udHMnLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBJVEVNU19UQUJMRV9OQU1FOiBpdGVtc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaXRlbXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoaGFuZGxlcik7XG5cbiAgICBjb25zdCBnZW5lcmF0b3JGbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnR2VuZXJhdG9yRm4nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9nZW5lcmF0b3IudHMnLFxuICAgICAgcnVudGltZTogUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgSVRFTVNfVEFCTEVfTkFNRTogaXRlbXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6IFwiYW50aHJvcGljLmNsYXVkZS0zLXNvbm5ldC0yMDI0MDIyOS12MTowXCJcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgaXRlbXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdG9yRm4pO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBTMyBidWNrZXQgZm9yIHB1enpsZSBpbWFnZXNcbiAgICBjb25zdCBwdXp6bGVJbWFnZXNCdWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsIFwiUHV6emxlSW1hZ2VzQnVja2V0XCIsIHtcbiAgICAgIGJ1Y2tldE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lLnRvTG93ZXJDYXNlKCl9LXB1enpsZS1pbWFnZXNgLCAvLyBjaGFuZ2UgaWYgbmVlZGVkXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLCAvLyBwdWJsaWMtcmVhZCBmb3IgZGVtby9kZXY7IHVzZSBzaWduZWQgVVJMcyBpbiBwcm9kIVxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBCbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgIGJsb2NrUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIGJsb2NrUHVibGljUG9saWN5OiBmYWxzZSxcbiAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIHJlc3RyaWN0UHVibGljQnVja2V0czogZmFsc2UsXG4gICAgICB9KSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgICAgY29yczogW1xuICAgICAgICB7XG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtIdHRwTWV0aG9kcy5HRVRdLFxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXCIqXCJdLFxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdLFxuICAgICAgICB9LFxuICAgICAgXVxuICAgIH0pO1xuXG4gICAgcHV6emxlSW1hZ2VzQnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCddLFxuICAgICAgICAgIHJlc291cmNlczogW3B1enpsZUltYWdlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyldLFxuICAgICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgIH0pXG4gICAgKTtcblxuLy8gR3JhbnQgd3JpdGUvdXBsb2FkIHBlcm1pc3Npb25zIHRvIHRoZSBnZW5lcmF0b3IgTGFtYmRhXG4gICAgcHV6emxlSW1hZ2VzQnVja2V0LmdyYW50UHV0KGdlbmVyYXRvckZuKTsgLy8gPC0tIGFzc3VtaW5nIGdlbmVyYXRvckZuIGlzIHlvdXIgaW1hZ2UtZ2VuZXJhdGluZyBsYW1iZGFcblxuLy8gUGFzcyBidWNrZXQgbmFtZSBhcyBhbiBlbnZpcm9ubWVudCB2YXJpYWJsZSB0byB0aGUgTGFtYmRhXG4gICAgZ2VuZXJhdG9yRm4uYWRkRW52aXJvbm1lbnQoXCJQVVpaTEVfSU1BR0VTX0JVQ0tFVFwiLCBwdXp6bGVJbWFnZXNCdWNrZXQuYnVja2V0TmFtZSk7XG4gICAgZ2VuZXJhdG9yRm4uYWRkRW52aXJvbm1lbnQoXCJCRURST0NLX0lNQUdFX01PREVMX0lEXCIsIFwiYW1hem9uLnRpdGFuLWltYWdlLWdlbmVyYXRvci12MVwiKTtcblxuXG4gICAgY29uc3QgZ2VuZXJhdG9yVGFzayA9IG5ldyBMYW1iZGFJbnZva2UodGhpcywgJ0ludm9rZUdlbmVyYXRvcicsIHtcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBnZW5lcmF0b3JGbixcbiAgICAgIHBheWxvYWQ6IFRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcbiAgICAgICAgdHlwZTogSnNvblBhdGguc3RyaW5nQXQoJyQudHlwZScpLFxuICAgICAgICBsYW5nOiBKc29uUGF0aC5zdHJpbmdBdCgnJC5sYW5nJyksXG4gICAgICB9KSxcbiAgICAgIHJlc3VsdFBhdGg6ICckLmdlbmVyYXRvclJlc3VsdCcsXG4gICAgfSk7XG5cbiAgICBjb25zdCBtYXBTdGF0ZSA9IG5ldyBNYXAodGhpcywgJ0ZvckVhY2gnLCB7XG4gICAgICBpdGVtc1BhdGg6ICckLml0ZW1zJyxcbiAgICAgIC8vIERPIE5PVCBzZXQgaXRlbVNlbGVjdG9yIG9yIHBhcmFtZXRlcnMgaGVyZSFcbiAgICB9KS5pdGVyYXRvcihnZW5lcmF0b3JUYXNrKTtcblxuICAgIGNvbnN0IHN0YXRlTWFjaGluZSA9IG5ldyBTdGF0ZU1hY2hpbmUodGhpcywgJ0dlbmVyYXRvclN0YXRlTWFjaGluZScsIHtcbiAgICAgIGRlZmluaXRpb246IG1hcFN0YXRlLFxuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygxNSksXG4gICAgfSk7XG5cblxuICAgIGNvbnN0IHJldmlld2VyRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ1Jldmlld2VyRm4nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9yZXZpZXdlci50cycsXG4gICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBJVEVNU19UQUJMRV9OQU1FOiBpdGVtc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH1cbiAgICB9KTtcbiAgICBpdGVtc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZXZpZXdlckZuKTtcblxuICAgIGdlbmVyYXRvckZuLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnLCAnYmVkcm9jazpJbnZva2VNb2RlbFdpdGhSZXNwb25zZVN0cmVhbSddLFxuICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6YmVkcm9jazoke3RoaXMucmVnaW9ufTo6Zm91bmRhdGlvbi1tb2RlbC8qYF1cbiAgICB9KSk7XG5cbiAgICAvLyBBc3N1bWUgeW91IGhhdmUgYWxyZWFkeSBkZWZpbmVkIHlvdXIgU3RhdGVNYWNoaW5lIChzZWUgYmVsb3cpXG4gICAgY29uc3Qgc3RlcEZuID0gc3RhdGVNYWNoaW5lO1xuXG4gICAgY29uc3QgcmVxdWVzdEl0ZW1zRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgXCJSZXF1ZXN0SXRlbXNGblwiLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9yZXF1ZXN0SXRlbXMudHMnLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46IHN0ZXBGbi5zdGF0ZU1hY2hpbmVBcm4sXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgc3RlcEZuLmdyYW50U3RhcnRFeGVjdXRpb24ocmVxdWVzdEl0ZW1zRm4pO1xuXG4gICAgLy8gM++4j+KDoyBBUEkgR2F0ZXdheVxuICAgIGNvbnN0IGFwaSA9IG5ldyBSZXN0QXBpKHRoaXMsICdIZWxsb0FwaScpO1xuICAgIGFwaS5yb290LmFkZE1ldGhvZCgnR0VUJywgbmV3IExhbWJkYUludGVncmF0aW9uKGhhbmRsZXIpKTtcbiAgICBjb25zdCBnZW5lcmF0ZVJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2dlbmVyYXRlJyk7XG4gICAgZ2VuZXJhdGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgTGFtYmRhSW50ZWdyYXRpb24oZ2VuZXJhdG9yRm4pKTtcbiAgICBhZGRDb3JzT3B0aW9ucyhnZW5lcmF0ZVJlc291cmNlKTtcbiAgICBjb25zdCByZXZpZXdSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyZXZpZXcnKTtcbiAgICByZXZpZXdSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgTGFtYmRhSW50ZWdyYXRpb24ocmV2aWV3ZXJGbikpO1xuICAgIGFkZENvcnNPcHRpb25zKHJldmlld1Jlc291cmNlKTtcbiAgICBjb25zdCBwZW5kaW5nUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgncGVuZGluZycpO1xuICAgIHBlbmRpbmdSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihsaXN0UGVuZGluZ0ZuKSk7XG4gICAgYWRkQ29yc09wdGlvbnMocGVuZGluZ1Jlc291cmNlKTtcbiAgICBjb25zdCByZXF1ZXN0SXRlbXNSZXNvdXJjZSA9IGFwaS5yb290LmFkZFJlc291cmNlKCdyZXF1ZXN0LWl0ZW1zJyk7XG4gICAgcmVxdWVzdEl0ZW1zUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IExhbWJkYUludGVncmF0aW9uKHJlcXVlc3RJdGVtc0ZuKSk7XG4gICAgYWRkQ29yc09wdGlvbnMocmVxdWVzdEl0ZW1zUmVzb3VyY2UpO1xuXG5cbiAgICAvLyA077iP4oOjIFMzIHN0YXRpYyBzaXRlIGJ1Y2tldFxuICAgIGNvbnN0IHNpdGVCdWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsIFwiU2l0ZUJ1Y2tldFwiLCB7XG4gICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBCbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgIGJsb2NrUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIGJsb2NrUHVibGljUG9saWN5OiBmYWxzZSxcbiAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgIHJlc3RyaWN0UHVibGljQnVja2V0czogZmFsc2UsXG4gICAgICB9KSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gT3B0aW9uYWw6IGFkZCBDT1JTIGZvciBTMyBpZiBuZWVkZWQgZm9yIHdlYiBmb250cy9pbWFnZXNcbiAgICBzaXRlQnVja2V0LmFkZENvcnNSdWxlKHtcbiAgICAgIGFsbG93ZWRNZXRob2RzOiBbSHR0cE1ldGhvZHMuR0VUXSxcbiAgICAgIGFsbG93ZWRPcmlnaW5zOiBbXCIqXCJdLFxuICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcIipcIl0sXG4gICAgfSk7XG5cbiAgICAvLyA177iP4oOjIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBTUEFcbiAgICBjb25zdCBvYWkgPSBuZXcgT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgXCJTaXRlT0FJXCIpO1xuICAgIHNpdGVCdWNrZXQuZ3JhbnRSZWFkKG9haSk7XG5cbiAgICBjb25zdCBjZiA9IG5ldyBEaXN0cmlidXRpb24odGhpcywgXCJTaXRlRGlzdHJpYnV0aW9uXCIsIHtcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiBcImluZGV4Lmh0bWxcIixcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xuICAgICAgICBvcmlnaW46IG5ldyBTM09yaWdpbihzaXRlQnVja2V0LCB7IG9yaWdpbkFjY2Vzc0lkZW50aXR5OiBvYWkgfSksXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBWaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcbiAgICAgIH0sXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIixcbiAgICAgICAgICB0dGw6IER1cmF0aW9uLm1pbnV0ZXMoNSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogXCIvaW5kZXguaHRtbFwiLFxuICAgICAgICAgIHR0bDogRHVyYXRpb24ubWludXRlcyg1KSxcbiAgICAgICAgfVxuICAgICAgXSxcbiAgICB9KTtcblxuICAgIC8vIDbvuI/ig6MgRGVwbG95IFJlYWN0IGJ1aWxkIHRvIFMzIGFuZCBpbnZhbGlkYXRlIENsb3VkRnJvbnRcbiAgICBuZXcgQnVja2V0RGVwbG95bWVudCh0aGlzLCBcIkRlcGxveVdlYnNpdGVcIiwge1xuICAgICAgc291cmNlczogW1NvdXJjZS5hc3NldChcImZyb250ZW5kL2J1aWxkXCIpXSwgLy8gPC0tIHVwZGF0ZSB0byB5b3VyIFJlYWN0IGJ1aWxkIG91dHB1dCBkaXJcbiAgICAgIGRlc3RpbmF0aW9uQnVja2V0OiBzaXRlQnVja2V0LFxuICAgICAgZGlzdHJpYnV0aW9uOiBjZixcbiAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbXCIvKlwiXSxcbiAgICB9KTtcblxuICAgIC8vIDfvuI/ig6MgT3V0cHV0IHdlYnNpdGUgVVJMIGZvciB5b3VyIGNvbnZlbmllbmNlXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIlNpdGVVUkxcIiwge1xuICAgICAgdmFsdWU6IFwiaHR0cHM6Ly9cIiArIGNmLmRvbWFpbk5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogXCJUaGUgQ2xvdWRGcm9udCBVUkwgb2YgdGhlIFJlYWN0IHJldmlldyBVSVwiXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==