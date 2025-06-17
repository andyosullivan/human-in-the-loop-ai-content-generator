import { Stack, StackProps, Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Bucket, BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import { Distribution, OriginAccessIdentity, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { CfnOutput } from "aws-cdk-lib";

export class GamePlayerAppStack extends Stack {
    public readonly gameSiteUrl: string;

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

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
