"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamePlayerAppStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cloudfront_1 = require("aws-cdk-lib/aws-cloudfront");
const aws_cloudfront_origins_1 = require("aws-cdk-lib/aws-cloudfront-origins");
const aws_s3_deployment_1 = require("aws-cdk-lib/aws-s3-deployment");
const aws_cdk_lib_2 = require("aws-cdk-lib");
class GamePlayerAppStack extends aws_cdk_lib_1.Stack {
    gameSiteUrl;
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 Bucket for the game player app
        const gameSiteBucket = new aws_s3_1.Bucket(this, "GameSiteBucket", {
            websiteIndexDocument: "index.html",
            publicReadAccess: true,
            blockPublicAccess: new aws_s3_1.BlockPublicAccess({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZS1wbGF5ZXItYXBwLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2FtZS1wbGF5ZXItYXBwLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUF5RTtBQUV6RSwrQ0FBK0Q7QUFDL0QsK0RBQXNHO0FBQ3RHLCtFQUE4RDtBQUM5RCxxRUFBeUU7QUFDekUsNkNBQXdDO0FBRXhDLE1BQWEsa0JBQW1CLFNBQVEsbUJBQUs7SUFDekIsV0FBVyxDQUFTO0lBRXBDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDeEQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsb0NBQW9DO1FBQ3BDLE1BQU0sY0FBYyxHQUFHLElBQUksZUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN0RCxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLGdCQUFnQixFQUFFLElBQUk7WUFDdEIsaUJBQWlCLEVBQUUsSUFBSSwwQkFBaUIsQ0FBQztnQkFDckMsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7YUFDL0IsQ0FBQztZQUNGLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU87WUFDcEMsaUJBQWlCLEVBQUUsSUFBSTtTQUMxQixDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHFDQUFvQixDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUM5RCxjQUFjLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRWxDLE1BQU0sTUFBTSxHQUFHLElBQUksNkJBQVksQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDMUQsaUJBQWlCLEVBQUUsWUFBWTtZQUMvQixlQUFlLEVBQUU7Z0JBQ2IsTUFBTSxFQUFFLElBQUksaUNBQVEsQ0FBQyxjQUFjLEVBQUUsRUFBRSxvQkFBb0IsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDdkUsb0JBQW9CLEVBQUUscUNBQW9CLENBQUMsaUJBQWlCO2FBQy9EO1lBQ0QsY0FBYyxFQUFFO2dCQUNaLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxrQkFBa0IsRUFBRSxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRSxzQkFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDdkcsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLGtCQUFrQixFQUFFLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO2FBQzFHO1NBQ0osQ0FBQyxDQUFDO1FBRUgsbUNBQW1DO1FBQ25DLElBQUksb0NBQWdCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzVDLE9BQU8sRUFBRSxDQUFDLDBCQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsNENBQTRDO1lBQ3RGLGlCQUFpQixFQUFFLGNBQWM7WUFDakMsWUFBWSxFQUFFLE1BQU07WUFDcEIsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLENBQUM7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCO1FBQ2pCLElBQUksdUJBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQy9CLEtBQUssRUFBRSxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVU7WUFDckMsV0FBVyxFQUFFLDRCQUE0QjtTQUM1QyxDQUFDLENBQUM7UUFFSCxtREFBbUQ7UUFDbkQsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQztJQUN0RCxDQUFDO0NBQ0o7QUFwREQsZ0RBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIER1cmF0aW9uLCBSZW1vdmFsUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuaW1wb3J0IHsgQnVja2V0LCBCbG9ja1B1YmxpY0FjY2VzcyB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcbmltcG9ydCB7IERpc3RyaWJ1dGlvbiwgT3JpZ2luQWNjZXNzSWRlbnRpdHksIFZpZXdlclByb3RvY29sUG9saWN5IH0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jbG91ZGZyb250XCI7XG5pbXBvcnQgeyBTM09yaWdpbiB9IGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zXCI7XG5pbXBvcnQgeyBCdWNrZXREZXBsb3ltZW50LCBTb3VyY2UgfSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnRcIjtcbmltcG9ydCB7IENmbk91dHB1dCB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xuXG5leHBvcnQgY2xhc3MgR2FtZVBsYXllckFwcFN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICAgIHB1YmxpYyByZWFkb25seSBnYW1lU2l0ZVVybDogc3RyaW5nO1xuXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgICAgIC8vIFMzIEJ1Y2tldCBmb3IgdGhlIGdhbWUgcGxheWVyIGFwcFxuICAgICAgICBjb25zdCBnYW1lU2l0ZUJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgXCJHYW1lU2l0ZUJ1Y2tldFwiLCB7XG4gICAgICAgICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXG4gICAgICAgICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IG5ldyBCbG9ja1B1YmxpY0FjY2Vzcyh7XG4gICAgICAgICAgICAgICAgYmxvY2tQdWJsaWNBY2xzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBibG9ja1B1YmxpY1BvbGljeTogZmFsc2UsXG4gICAgICAgICAgICAgICAgaWdub3JlUHVibGljQWNsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgcmVzdHJpY3RQdWJsaWNCdWNrZXRzOiBmYWxzZSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGdhbWVPYWkgPSBuZXcgT3JpZ2luQWNjZXNzSWRlbnRpdHkodGhpcywgXCJHYW1lU2l0ZU9BSVwiKTtcbiAgICAgICAgZ2FtZVNpdGVCdWNrZXQuZ3JhbnRSZWFkKGdhbWVPYWkpO1xuXG4gICAgICAgIGNvbnN0IGdhbWVDZiA9IG5ldyBEaXN0cmlidXRpb24odGhpcywgXCJHYW1lU2l0ZURpc3RyaWJ1dGlvblwiLCB7XG4gICAgICAgICAgICBkZWZhdWx0Um9vdE9iamVjdDogXCJpbmRleC5odG1sXCIsXG4gICAgICAgICAgICBkZWZhdWx0QmVoYXZpb3I6IHtcbiAgICAgICAgICAgICAgICBvcmlnaW46IG5ldyBTM09yaWdpbihnYW1lU2l0ZUJ1Y2tldCwgeyBvcmlnaW5BY2Nlc3NJZGVudGl0eTogZ2FtZU9haSB9KSxcbiAgICAgICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZXJyb3JSZXNwb25zZXM6IFtcbiAgICAgICAgICAgICAgICB7IGh0dHBTdGF0dXM6IDQwMywgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsIHJlc3BvbnNlUGFnZVBhdGg6IFwiL2luZGV4Lmh0bWxcIiwgdHRsOiBEdXJhdGlvbi5taW51dGVzKDUpIH0sXG4gICAgICAgICAgICAgICAgeyBodHRwU3RhdHVzOiA0MDQsIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLCByZXNwb25zZVBhZ2VQYXRoOiBcIi9pbmRleC5odG1sXCIsIHR0bDogRHVyYXRpb24ubWludXRlcyg1KSB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVwbG95IG5ldyBSZWFjdCBnYW1lIHBsYXllciBhcHBcbiAgICAgICAgbmV3IEJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJEZXBsb3lHYW1lV2Vic2l0ZVwiLCB7XG4gICAgICAgICAgICBzb3VyY2VzOiBbU291cmNlLmFzc2V0KFwiZ2FtZS11aS9idWlsZFwiKV0sIC8vIDwtLSB1cGRhdGUgaWYgeW91ciBidWlsZCBkaXIgaXMgZGlmZmVyZW50XG4gICAgICAgICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogZ2FtZVNpdGVCdWNrZXQsXG4gICAgICAgICAgICBkaXN0cmlidXRpb246IGdhbWVDZixcbiAgICAgICAgICAgIGRpc3RyaWJ1dGlvblBhdGhzOiBbXCIvKlwiXSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gT3V0cHV0IHRoZSBVUkxcbiAgICAgICAgbmV3IENmbk91dHB1dCh0aGlzLCBcIkdhbWVTaXRlVVJMXCIsIHtcbiAgICAgICAgICAgIHZhbHVlOiBcImh0dHBzOi8vXCIgKyBnYW1lQ2YuZG9tYWluTmFtZSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlB1YmxpYyBHYW1lIFBsYXllciBBcHAgVVJMXCIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIElmIHlvdSB3YW50IHRvIGFjY2VzcyB0aGUgVVJMIGluIHlvdXIgbWFpbiBzdGFja1xuICAgICAgICB0aGlzLmdhbWVTaXRlVXJsID0gXCJodHRwczovL1wiICsgZ2FtZUNmLmRvbWFpbk5hbWU7XG4gICAgfVxufVxuIl19