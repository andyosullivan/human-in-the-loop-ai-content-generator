import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
export declare class AwslambdahackathonStack extends Stack {
    readonly itemsTable: Table;
    constructor(scope: Construct, id: string, props?: StackProps);
}
