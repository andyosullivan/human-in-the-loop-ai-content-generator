"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePlayerAppStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_s3_2 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const aws_lambda_1 = require("aws-cdk-lib/aws-lambda");
class GamePlayerAppStack extends aws_cdk_lib_1.Stack {
    gameSiteUrl;
    constructor(scope, id, props) {
        super(scope, id, props);
        const itemsTable = props.itemsTable;
        const randomApprovedFn = new aws_lambda_nodejs_1.NodejsFunction(this, "RandomApprovedFn", {
            entry: "lambda/randomApproved.ts", // Lambda code shown in my previous message!
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName
            }
        });
        itemsTable.grantReadData(randomApprovedFn);
        // --- 2. API Gateway ---
        const api = new aws_apigateway_1.RestApi(this, "GamePlayerApi");
        const randomApprovedResource = api.root.addResource("random-approved");
        randomApprovedResource.addMethod("GET", new aws_apigateway_1.LambdaIntegration(randomApprovedFn));
        // CORS preflight
        randomApprovedResource.addMethod("OPTIONS", new aws_apigateway_1.MockIntegration({
            integrationResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": "'*'",
                        "method.response.header.Access-Control-Allow-Origin": "'*'",
                        "method.response.header.Access-Control-Allow-Methods": "'OPTIONS,GET'",
                    }
                }],
            passthroughBehavior: aws_apigateway_1.PassthroughBehavior.NEVER,
            requestTemplates: { "application/json": "{\"statusCode\": 200}" }
        }), {
            methodResponses: [{
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Access-Control-Allow-Headers": true,
                        "method.response.header.Access-Control-Allow-Methods": true,
                        "method.response.header.Access-Control-Allow-Origin": true,
                    }
                }]
        });
        // S3 Bucket for the game player app
        const gameSiteBucket = new aws_s3_1.Bucket(this, "GameSiteBucket", {
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
        const gameOai = new aws_cloudfront_1.OriginAccessIdentity(this, "GameSiteOAI");
        gameSiteBucket.grantRead(gameOai);
        const gameCf = new aws_cloudfront_1.Distribution(this, "GameSiteDistribution", {
            defaultRootObject: "index.html",
            defaultBehavior: {
                origin: new aws_cloudfront_origins_1.S3Origin(gameSiteBucket, { originAccessIdentity: gameOai }),
                viewerProtocolPolicy: aws_cloudfront_1.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            errorResponses: [
                { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: aws_cdk_lib_1.Duration.minutes(5) },
                { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html", ttl: aws_cdk_lib_1.Duration.minutes(5) },
            ],
        });
        // Deploy new React game player app
        new aws_s3_deployment_1.BucketDeployment(this, "DeployGameWebsite", {
            sources: [aws_s3_deployment_1.Source.asset("game-ui/build")], // <-- update if your build dir is different
            destinationBucket: gameSiteBucket,
            distribution: gameCf,
            distributionPaths: ["/*"],
        });
        // Output the URL
        new aws_cdk_lib_2.CfnOutput(this, "GameSiteURL", {
            value: "https://" + gameCf.domainName,
            description: "Public Game Player App URL",
        });
        // If you want to access the URL in your main stack
        this.gameSiteUrl = "https://" + gameCf.domainName;
    }
}
exports.GamePlayerAppStack = GamePlayerAppStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZS1wbGF5ZXItYXBwLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2FtZS1wbGF5ZXItYXBwLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUF5RTtBQUV6RSxxRUFBK0Q7QUFDL0QsK0RBQXdIO0FBRXhILCtDQUF5RDtBQUN6RCwrQ0FBdUQ7QUFDdkQsK0RBQXNHO0FBQ3RHLCtFQUE4RDtBQUM5RCxxRUFBeUU7QUFDekUsNkNBQXdDO0FBQ3hDLHVEQUErQztBQU0vQyxNQUFhLGtCQUFtQixTQUFRLG1CQUFLO0lBQ3pCLFdBQVcsQ0FBUztJQUVwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQThCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFFcEMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGtDQUFjLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2xFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSw0Q0FBNEM7WUFDL0UsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLFdBQVcsRUFBRTtnQkFDVCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUzthQUN6QztTQUNKLENBQUMsQ0FBQztRQUNILFVBQVUsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUUzQyx5QkFBeUI7UUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSx3QkFBTyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUMvQyxNQUFNLHNCQUFzQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdkUsc0JBQXNCLENBQUMsU0FBUyxDQUFDLEtBQUssRUFB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QztRQUVILG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsV0FBVyxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3RELENBQUM7Q0FDSjtBQWhHRCxnREFnR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcywgRHVyYXRpb24sIFJlbW92YWxQb2xpY3kgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqc1wiO1xuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24sIFJlc3RBcGksIFJlc291cmNlLCBNb2NrSW50ZWdyYXRpb24sIFBhc3N0aHJvdWdoQmVoYXZpb3IgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXlcIjtcbmltcG9ydCB7IFRhYmxlLCBBdHRyaWJ1dGVUeXBlLCBCaWxsaW5nTW9kZSB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcbmltcG9ydCB7IEJ1Y2tldCwgSHR0cE1ldGhvZHMgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgeyBCbG9ja1B1YmxpY0FjY2VzcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IERpc3RyaWJ1dGlvbiwgT3JpZ2luQWNjZXNzSWRlbnRpdHksIFZpZXdlclByb3RvY29sUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jbG91ZGZyb250XCI7XG5pbXBvcnQgeyBTM09yaWdpbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zXCI7XG5pbXBvcnQgeyBCdWNrZXREZXBsb3ltZW50LCBTb3VyY2UgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnRcIjtcbmltcG9ydCB7IENmbk91dHB1dCB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuaW1wb3J0IHtSdW50aW1lfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIEdhbWVQbGF5ZXJBcHBTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gICAgaXRlbXNUYWJsZTogVGFibGU7XG59XG5cbmV4cG9ydCBjbGFzcyBHYW1lUGxheWVyQXBwU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gICAgcHVibGljIHJlYWRvbmx5IGdhbWVTaXRlVXJsOiBzdHJpbmc7XG5cbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogR2FtZVBsYXllckFwcFN0YWNrUHJvcHMpIHtcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAgICAgY29uc3QgaXRlbXNUYWJsZSA9IHByb3BzLml0ZW1zVGFibGU7XG5cbiAgICAgICAgY29uc3QgcmFuZG9tQXBwcm92ZWRGbiA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCBcIlJhbmRvbUFwcHJvdmVkRm5cIiwge1xuICAgICAgICAgICAgZW50cnk6IFwibGFtYmRhL3JhbmRvbUFwcHJvdmVkLnRzXCIsIC8vIExhbWJkYSBjb2RlIHNob3duIGluIG15IHByZXZpb3VzIG1lc3NhZ2UhXG4gICAgICAgICAgICBydW50aW1lOiBSdW50aW1lLk5PREVKU18yMF9YLFxuICAgICAgICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgICAgICAgIElURU1TX1RBQkxFX05BTUU6IGl0ZW1zVGFibGUudGFibGVOYW1lXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBpdGVtc1RhYmxlLmdyYW50UmVhZERhdGEocmFuZG9tQXBwcm92ZWRGbik7XG5cbiAgICAgICAgLy8gLS0tIDIuIEFQSSBHYXRld2F5IC0tLVxuICAgICAgICBjb25zdCBhcGkgPSBuZXcgUmVzdEFwaSh0aGlzLCBcIkdhbWVQbGF5ZXJBcGlcIik7XG4gICAgICAgIGNvbnN0IHJhbmRvbUFwcHJvdmVkUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZShcInJhbmRvbS1hcHByb3ZlZFwiKTtcbiAgICAgICAgcmFuZG9tQXBwcm92ZWRSZXNvdXJjZS5hZGRNZXRob2QoXCJHRVRcIiwgbmV3IExhbWJkYUludGVncmF0aW9uKHJhbmRvbUFwcHJvdmVkRm4pKTtcblxuICAgICAgICAvLyBDT1JTIHByZWZsaWdodFxuICAgICAgICByYW5kb21BcHByb3ZlZFJlc291cmNlLmFkZE1ldGhvZChcbiAgICAgICAgICAgIFwiT1BUSU9OU1wiLFxuICAgICAgICAgICAgbmV3IE1vY2tJbnRlZ3JhdGlvbih7XG4gICAgICAgICAgICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCInKidcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCInKidcIixcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiJ09QVElPTlMsR0VUJ1wiLFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfV0sXG4gICAgICAgICAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogUGFzc3Rocm91Z2hCZWhhdmlvci5ORVZFUixcbiAgICAgICAgICAgICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7IFwiYXBwbGljYXRpb24vanNvblwiOiBcIntcXFwic3RhdHVzQ29kZVxcXCI6IDIwMH1cIiB9XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBtZXRob2RSZXNwb25zZXM6IFt7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGU6IFwiMjAwXCIsXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgXCJtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIFwibWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBcIm1ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XVxuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIC8vIFMzIEJ1Y2tldCBmb3IgdGhlIGdhbWUgcGxheWVyIGFwcFxuICAgICAgICBjb25zdCBnYW1lU2l0ZUJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgXCJHYW1lU2l0ZUJ1Y2tldFwiLCB7XG4gICAgICAgICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXG4gICAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBCbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBibG9ja1B1YmxpY1BvbGljeTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmVzdHJpY3RQdWJsaWNCdWNrZXRzOiBmYWxzZSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGdhbWVPYWkgPSBuZXcgT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgXCJHYW1lU2l0ZU9BSVwiKTtcbiAgICAgICAgZ2FtZVNpdGVCdWNrZXQuZ3JhbnRSZWFkKGdhbWVPYWkpO1xuXG4gICAgICAgIGNvbnN0IGdhbWVDZiA9IG5ldyBEaXN0cmlidXRpb24odGhpcywgXCJHYW1lU2l0ZURpc3RyaWJ1dGlvblwiLCB7XG4gICAgICAgICAgICBkZWZhdWx0Um9vdE9iamVjdDogXCJpbmRleC5odG1sXCIsXG4gICAgICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICAgICAgICBvcmlnaW46IG5ldyBTM09yaWdpbihnYW1lU2l0ZUJ1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eTogZ2FtZU9haSB9KSxcbiAgICAgICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7IGh0dHBTdGF0dXM6IDQwMywgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIiwgdHRsOiBEdXJhdGlvbi5taW51dGVzKDUpIH0sXG4gICAgICAgICAgICAgICAgeyBodHRwU3RhdHVzOiA0MDQsIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLCByZXNwb25zZVBhZ2VQYXRoOiBcIi9pbmRleC5odG1sXCIsIHR0bDogRHVyYXRpb24ubWludXRlcyg1KSB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVwbG95IG5ldyBSZWFjdCBnYW1lIHBsYXllciBhcHBcbiAgICAgICAgbmV3IEJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJEZXBsb3lHYW1lV2Vic2l0ZVwiLCB7XG4gICAgICAgICAgICBzb3VyY2VzOiBbU291cmNlLmFzc2V0KFwiZ2FtZS11aS9idWlsZFwiKV0sIC8vIDwtLSB1cGRhdGUgaWYgeW91ciBidWlsZCBkaXIgaXMgZGlmZmVyZW50XG4gICAgICAgICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogZ2FtZVNpdGVCdWNrZXQsXG4gICAgICAgICAgICBkaXN0cmlidXRpb246IGdhbWVDZixcbiAgICAgICAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbXCIvKlwiXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gT3V0cHV0IHRoZSBVUkxcbiAgICAgICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIkdhbWVTaXRlVVJMXCIsIHtcbiAgICAgICAgICAgIHZhbHVlOiBcImh0dHBzOi8vXCIgKyBnYW1lQ2YuZG9tYWluTmFtZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlB1YmxpYyBHYW1lIFBsYXllciBBcHAgVVJMXCIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0aGUgVVJMIGluIHlvdXIgbWFpbiBzdGFja1xuICAgICAgICB0aGlzLmdhbWVTaXRlVXJsID0gXCJodHRwczovL1wiICsgZ2FtZUNmLmRvbWFpbk5hbWU7XG4gICAgfVxufVxuIl19