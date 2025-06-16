// lambda/listPending.ts
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const REGION = process.env.AWS_REGION || "eu-west-1";
const ddb = new DynamoDBClient({ region: REGION });

export const handler = async () => {
    // GSI on status recommended for real apps. For now, use scan (ok for demo).
    const { Items } = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "StatusIndex", // Add this GSI if not present!
        KeyConditionExpression: "#s = :pending",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":pending": { S: "PENDING" } }
    }));
    const items = (Items || []).map(item => ({
        itemId: item.itemId.S,
        version: Number(item.version.N),
        type: item.type.S,
        status: item.status.S,
        lang: item.lang.S,
        createdAt: item.createdAt.S,
        spec: item.spec && item.spec.S ? JSON.parse(item.spec.S) : {}
    }));
    return { statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",   // allow all domains
            "Access-Control-Allow-Headers": "*",  // allow any headers
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
        },body: JSON.stringify({ items }) };
};
