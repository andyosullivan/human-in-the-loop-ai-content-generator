import { Stack, StackProps, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LambdaIntegration, RestApi, Resource, MockIntegration, PassthroughBehavior } from "aws-cdk-lib/aws-apigateway";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { CfnOutput } from "aws-cdk-lib";
import {Runtime} from "aws-cdk-lib/aws-lambda";

export interface GamePlayerAppStackProps extends StackProps {
    itemsTable: Table;
    analyticsTable: Table;
}

export class GamePlayerAppStack extends Stack {
    public readonly gameSiteUrl: string;

    constructor(scope: Construct, id: string, props: GamePlayerAppStackProps) {
        super(scope, id, props);

        const itemsTable = props.itemsTable;
        const analyticsTable = props.analyticsTable;

        const randomApprovedFn = new NodejsFunction(this, "RandomApprovedFn", {
            entry: "lambda/randomApproved.ts", // Lambda code shown in my previous message!
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(10),
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName
            }
        });
        itemsTable.grantReadData(randomApprovedFn);

        const logAnalyticsFn = new NodejsFunction(this, "LogAnalyticsFn", {
            entry: "lambda/logAnalytics.ts", // <--- make sure this is your Lambda's path
            runtime: Runtime.NODEJS_20_X,
            timeout: Duration.seconds(5),
            memorySize: 128,
            environment: {
                ANALYTICS_TABLE_NAME: analyticsTable.tableName
            }
        });
        analyticsTable.grantWriteData(logAnalyticsFn);

        // API Gateway ---
        const api = new RestApi(this, "GamePlayerApi");
        const randomApprovedResource = api.root.addResource("random-approved");
        randomApprovedResource.addMethod("GET", new LambdaIntegration(randomApprovedFn));

        // CORS preflight
        randomApprovedResource.addMethod(
            "OPTIONS",
            new MockIntegration({
                integrationResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": "'*'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET'",
                    }
                }],
                passthroughBehavior: PassthroughBehavior.NEVER,
                requestTemplates: { "application/json": "{\"statusCode\": 200}" }
            }),
            {
                methodResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": true,
                        "method.response.header.Access-Control-Allow-Methods": true,
                        "method.response.header.Access-Control-Allow-Origin": true,
                    }
                }]
            }
        );

        const analyticsResource = api.root.addResource("log-analytics");
        analyticsResource.addMethod("POST", new LambdaIntegration(logAnalyticsFn));

// CORS preflight for POST
        analyticsResource.addMethod(
            "OPTIONS",
            new MockIntegration({
                integrationResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": "'*'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,POST'",
                    }
                }],
                passthroughBehavior: PassthroughBehavior.NEVER,
                requestTemplates: { "application/json": "{\"statusCode\": 200}" }
            }),
            {
                methodResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": true,
                        "method.response.header.Access-Control-Allow-Methods": true,
                        "method.response.header.Access-Control-Allow-Origin": true,
                    }
                }]
            }
        );


        // S3 Bucket for the game player app
        const gameSiteBucket = new Bucket(this, "GameSiteBucket", {
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

        const gameOai = new OriginAccessIdentity(this, "GameSiteOAI");
        gameSiteBucket.grantRead(gameOai);

        const gameCf = new Distribution(this, "GameSiteDistribution", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new S3Origin(gameSiteBucket, { originAccessIdentity: gameOai }),
                viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
                { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: Duration.minutes(5) },
                { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: Duration.minutes(5) },
            ],
        });

        // Deploy new React game player app
        new BucketDeployment(this, "DeployGameWebsite", {
            sources: [Source.asset("game-ui/build")], // <-- update if your build dir is different
            destinationBucket: gameSiteBucket,
            distribution: gameCf,
            distributionPaths: ["/*"],
        });

        // Output the URL
        new CfnOutput(this, "GameSiteURL", {
            value: "https://" + gameCf.domainName,
            description: "Public Game Player App URL",
        });

        // If you want to access the URL in your main stack
        this.gameSiteUrl = "https://" + gameCf.domainName;
    }
}
