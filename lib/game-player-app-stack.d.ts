import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
export interface GamePlayerAppStackProps extends StackProps {
    itemsTable: Table;
}
export declare class GamePlayerAppStack extends Stack {
    readonly gameSiteUrl: string;
    constructor(scope: Construct, id: string, props: GamePlayerAppStackProps);
}
