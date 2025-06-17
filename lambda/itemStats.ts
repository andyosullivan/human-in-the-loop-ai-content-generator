// lambda/itemStats.ts
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;

export const handler = async () => {
    const res = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "#ty, #st",
        ExpressionAttributeNames: { "#ty": "type", "#st": "status" }
    }));

    // Aggregate
    const stats: Record<string, Record<string, number>> = {};
    let total = 0;
    (res.Items || []).forEach((item: any) => {
        const type = item.type?.S || item["#ty"]?.S || "unknown";
        const status = item.status?.S || item["#st"]?.S || "unknown";
        stats[type] = stats[type] || { PENDING: 0, APPROVED: 0, REJECTED: 0, TOTAL: 0 };
        if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
            stats[type][status] += 1;
        }
        stats[type].TOTAL += 1;
        total += 1;
    });

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify({ total, byType: stats })
    };
};
