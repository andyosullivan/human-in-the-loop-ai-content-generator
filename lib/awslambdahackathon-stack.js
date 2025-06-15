"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AwslambdahackathonStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_lambda_nodejs_1 = require("aws-cdk-lib/aws-lambda-nodejs");
const aws_apigateway_1 = require("aws-cdk-lib/aws-apigateway");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
class AwslambdahackathonStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        /* 1️⃣  DynamoDB table */
        const itemsTable = new aws_dynamodb_1.Table(this, 'ItemsTable', {
            partitionKey: { name: 'itemId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'version', type: aws_dynamodb_1.AttributeType.NUMBER },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST, // on-demand, no capacity planning
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY, // ← keep DEV easy; change to RETAIN in prod
        });
        /* 2️⃣  Example: give your existing HelloFn (or a new Lambda) access */
        const handler = new aws_lambda_nodejs_1.NodejsFunction(this, 'HelloFn', {
            entry: 'lambda/hello.ts',
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName,
            },
        });
        itemsTable.grantReadWriteData(handler);
        /* 3️⃣  (unchanged) — API Gateway wired to handler */
        const api = new aws_apigateway_1.RestApi(this, 'HelloApi');
        api.root.addMethod('GET', new aws_apigateway_1.LambdaIntegration(handler));
    }
}
exports.AwslambdahackathonStack = AwslambdahackathonStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUF5RTtBQUV6RSxxRUFBK0Q7QUFDL0QsK0RBQXdFO0FBQ3hFLDJEQUlrQztBQUVsQyxNQUFhLHVCQUF3QixTQUFRLG1CQUFLO0lBQ2hELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBa0I7UUFDMUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLE1BQU0sVUFBVSxHQUFHLElBQUksb0JBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQy9DLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzVELE9BQU8sRUFBTyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzdELFdBQVcsRUFBRywwQkFBVyxDQUFDLGVBQWUsRUFBSSxrQ0FBa0M7WUFDL0UsYUFBYSxFQUFFLDJCQUFhLENBQUMsT0FBTyxFQUFTLDRDQUE0QztTQUMxRixDQUFDLENBQUM7UUFFSCx1RUFBdUU7UUFDdkUsTUFBTSxPQUFPLEdBQUcsSUFBSSxrQ0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDbEQsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUzthQUN2QztTQUNGLENBQUMsQ0FBQztRQUNILFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV2QyxxREFBcUQ7UUFDckQsTUFBTSxHQUFHLEdBQUcsSUFBSSx3QkFBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxrQ0FBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRjtBQTFCRCwwREEwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdGFjaywgU3RhY2tQcm9wcywgRHVyYXRpb24sIFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCB7IE5vZGVqc0Z1bmN0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0IHsgTGFtYmRhSW50ZWdyYXRpb24sIFJlc3RBcGkgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQge1xuICBUYWJsZSxcbiAgQXR0cmlidXRlVHlwZSxcbiAgQmlsbGluZ01vZGUsXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5cbmV4cG9ydCBjbGFzcyBBd3NsYW1iZGFoYWNrYXRob25TdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBTdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvKiAx77iP4oOjICBEeW5hbW9EQiB0YWJsZSAqL1xuICAgIGNvbnN0IGl0ZW1zVGFibGUgPSBuZXcgVGFibGUodGhpcywgJ0l0ZW1zVGFibGUnLCB7XG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2l0ZW1JZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBzb3J0S2V5OiAgICAgIHsgbmFtZTogJ3ZlcnNpb24nLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxuICAgICAgYmlsbGluZ01vZGU6ICBCaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsICAgLy8gb24tZGVtYW5kLCBubyBjYXBhY2l0eSBwbGFubmluZ1xuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAgICAgICAgLy8g4oaQIGtlZXAgREVWIGVhc3k7IGNoYW5nZSB0byBSRVRBSU4gaW4gcHJvZFxuICAgIH0pO1xuXG4gICAgLyogMu+4j+KDoyAgRXhhbXBsZTogZ2l2ZSB5b3VyIGV4aXN0aW5nIEhlbGxvRm4gKG9yIGEgbmV3IExhbWJkYSkgYWNjZXNzICovXG4gICAgY29uc3QgaGFuZGxlciA9IG5ldyBOb2RlanNGdW5jdGlvbih0aGlzLCAnSGVsbG9GbicsIHtcbiAgICAgIGVudHJ5OiAnbGFtYmRhL2hlbGxvLnRzJyxcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMTApLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgSVRFTVNfVEFCTEVfTkFNRTogaXRlbXNUYWJsZS50YWJsZU5hbWUsXG4gICAgICB9LFxuICAgIH0pO1xuICAgIGl0ZW1zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGhhbmRsZXIpO1xuXG4gICAgLyogM++4j+KDoyAgKHVuY2hhbmdlZCkg4oCUIEFQSSBHYXRld2F5IHdpcmVkIHRvIGhhbmRsZXIgKi9cbiAgICBjb25zdCBhcGkgPSBuZXcgUmVzdEFwaSh0aGlzLCAnSGVsbG9BcGknKTtcbiAgICBhcGkucm9vdC5hZGRNZXRob2QoJ0dFVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihoYW5kbGVyKSk7XG4gIH1cbn1cbiJdfQ==