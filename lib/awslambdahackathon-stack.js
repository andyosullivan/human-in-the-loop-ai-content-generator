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
        /* Generator Lambda  */
        const generatorFn = new aws_lambda_nodejs_1.NodejsFunction(this, 'GeneratorFn', {
            entry: 'lambda/generator.ts',
            runtime: aws_lambda_1.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                ITEMS_TABLE_NAME: itemsTable.tableName,
                BEDROCK_MODEL_ID: "anthropic.claude-3-sonnet-20240229-v1:0" // ← pick your model
            },
        });
        // write permission to DynamoDB
        itemsTable.grantReadWriteData(generatorFn);
        // Bedrock invoke permission
        generatorFn.addToRolePolicy(new iam.PolicyStatement({
            actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`]
        }));
        /* 3️⃣  (unchanged) — API Gateway wired to handler */
        const api = new aws_apigateway_1.RestApi(this, 'HelloApi');
        api.root.addMethod('GET', new aws_apigateway_1.LambdaIntegration(handler));
        api.root.addResource('generate')
            .addMethod('POST', new aws_apigateway_1.LambdaIntegration(generatorFn));
    }
}
exports.AwslambdahackathonStack = AwslambdahackathonStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkNBQXlFO0FBRXpFLHFFQUErRDtBQUMvRCwrREFBd0U7QUFDeEUsMkRBSWtDO0FBQ2xDLHlEQUEyQztBQUMzQyx1REFBaUQ7QUFFakQsTUFBYSx1QkFBd0IsU0FBUSxtQkFBSztJQUNoRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWtCO1FBQzFELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHlCQUF5QjtRQUN6QixNQUFNLFVBQVUsR0FBRyxJQUFJLG9CQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUMvQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUM1RCxPQUFPLEVBQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUM3RCxXQUFXLEVBQUcsMEJBQVcsQ0FBQyxlQUFlLEVBQUksa0NBQWtDO1lBQy9FLGFBQWEsRUFBRSwyQkFBYSxDQUFDLE9BQU8sRUFBUyw0Q0FBNEM7U0FDMUYsQ0FBQyxDQUFDO1FBRUgsdUVBQXVFO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLElBQUksa0NBQWMsQ0FBQyxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ2xELEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsT0FBTyxFQUFFLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM3QixXQUFXLEVBQUU7Z0JBQ1gsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLFNBQVM7YUFDdkM7U0FDRixDQUFDLENBQUM7UUFDSCxVQUFVLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdkMsdUJBQXVCO1FBQ3ZCLE1BQU0sV0FBVyxHQUFHLElBQUksa0NBQWMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzFELEtBQUssRUFBRSxxQkFBcUI7WUFDNUIsT0FBTyxFQUFFLG9CQUFPLENBQUMsV0FBVztZQUM1QixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLFVBQVUsRUFBRSxHQUFHO1lBQ2YsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUN0QyxnQkFBZ0IsRUFBRSx5Q0FBeUMsQ0FBRSxvQkFBb0I7YUFDbEY7U0FDRixDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsVUFBVSxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTNDLDRCQUE0QjtRQUM1QixXQUFXLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRCxPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSx1Q0FBdUMsQ0FBQztZQUN6RSxTQUFTLEVBQUUsQ0FBQyxtQkFBbUIsSUFBSSxDQUFDLE1BQU0sc0JBQXNCLENBQUM7U0FDbEUsQ0FBQyxDQUFDLENBQUM7UUFFSixxREFBcUQ7UUFDckQsTUFBTSxHQUFHLEdBQUcsSUFBSSx3QkFBTyxDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztRQUMxQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxrQ0FBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzFELEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQzthQUMzQixTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksa0NBQWlCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUM3RCxDQUFDO0NBQ0Y7QUFqREQsMERBaURDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIER1cmF0aW9uLCBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgeyBOb2RlanNGdW5jdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcbmltcG9ydCB7IExhbWJkYUludGVncmF0aW9uLCBSZXN0QXBpIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0IHtcbiAgVGFibGUsXG4gIEF0dHJpYnV0ZVR5cGUsXG4gIEJpbGxpbmdNb2RlLFxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgUnVudGltZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuXG5leHBvcnQgY2xhc3MgQXdzbGFtYmRhaGFja2F0aG9uU3RhY2sgZXh0ZW5kcyBTdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLyogMe+4j+KDoyAgRHluYW1vREIgdGFibGUgKi9cbiAgICBjb25zdCBpdGVtc1RhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdJdGVtc1RhYmxlJywge1xuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdpdGVtSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgICAgc29ydEtleTogICAgICB7IG5hbWU6ICd2ZXJzaW9uJywgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiAgQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULCAgIC8vIG9uLWRlbWFuZCwgbm8gY2FwYWNpdHkgcGxhbm5pbmdcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuREVTVFJPWSwgICAgICAgIC8vIOKGkCBrZWVwIERFViBlYXN5OyBjaGFuZ2UgdG8gUkVUQUlOIGluIHByb2RcbiAgICB9KTtcblxuICAgIC8qIDLvuI/ig6MgIEV4YW1wbGU6IGdpdmUgeW91ciBleGlzdGluZyBIZWxsb0ZuIChvciBhIG5ldyBMYW1iZGEpIGFjY2VzcyAqL1xuICAgIGNvbnN0IGhhbmRsZXIgPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0hlbGxvRm4nLCB7XG4gICAgICBlbnRyeTogJ2xhbWJkYS9oZWxsby50cycsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDEwKSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIElURU1TX1RBQkxFX05BTUU6IGl0ZW1zVGFibGUudGFibGVOYW1lLFxuICAgICAgfSxcbiAgICB9KTtcbiAgICBpdGVtc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShoYW5kbGVyKTtcblxuICAgIC8qIEdlbmVyYXRvciBMYW1iZGEgICovXG4gICAgY29uc3QgZ2VuZXJhdG9yRm4gPSBuZXcgTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dlbmVyYXRvckZuJywge1xuICAgICAgZW50cnk6ICdsYW1iZGEvZ2VuZXJhdG9yLnRzJyxcbiAgICAgIHJ1bnRpbWU6IFJ1bnRpbWUuTk9ERUpTXzIwX1gsXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIElURU1TX1RBQkxFX05BTUU6IGl0ZW1zVGFibGUudGFibGVOYW1lLFxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MFwiICAvLyDihpAgcGljayB5b3VyIG1vZGVsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgLy8gd3JpdGUgcGVybWlzc2lvbiB0byBEeW5hbW9EQlxuICAgIGl0ZW1zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdlbmVyYXRvckZuKTtcblxuICAgIC8vIEJlZHJvY2sgaW52b2tlIHBlcm1pc3Npb25cbiAgICBnZW5lcmF0b3JGbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJywgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nXSxcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmJlZHJvY2s6JHt0aGlzLnJlZ2lvbn06OmZvdW5kYXRpb24tbW9kZWwvKmBdXG4gICAgfSkpO1xuXG4gICAgLyogM++4j+KDoyAgKHVuY2hhbmdlZCkg4oCUIEFQSSBHYXRld2F5IHdpcmVkIHRvIGhhbmRsZXIgKi9cbiAgICBjb25zdCBhcGkgPSBuZXcgUmVzdEFwaSh0aGlzLCAnSGVsbG9BcGknKTtcbiAgICBhcGkucm9vdC5hZGRNZXRob2QoJ0dFVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihoYW5kbGVyKSk7XG4gICAgYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2dlbmVyYXRlJylcbiAgICAgICAgLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBMYW1iZGFJbnRlZ3JhdGlvbihnZW5lcmF0b3JGbikpO1xuICB9XG59XG4iXX0=