// lambda/itemStats.ts
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;

export const handler = async () => {
    // Alias both reserved words: type and status
    const res = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: "#ty, #st",
        ExpressionAttributeNames: { "#ty": "type", "#st": "status" }
    }));

    const stats: Record<string, number> = {};
    let total = 0;
    (res.Items || []).forEach((item: any) => {
        // Access the aliases
        const type = item["#ty"]?.S || item.type?.S || "unknown";
        const status = item["#st"]?.S || item.status?.S || "unknown";
        stats[`${type} (${status})`] = (stats[`${type} (${status})`] || 0) + 1;
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
