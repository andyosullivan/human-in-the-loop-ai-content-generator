import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
export declare class GamePlayerAppStack extends Stack {
    readonly gameSiteUrl: string;
    constructor(scope: Construct, id: string, props?: StackProps);
}
