// lambda/reviewer.ts
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const REGION = process.env.AWS_REGION || "eu-west-1";

const ddb = new DynamoDBClient({ region: REGION });

export const handler = async (event: any = {}): Promise<any> => {
    let body;
    try {
        body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (err) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }

    const { itemId, version, status, reviewer, comment } = body || {};
    if (!itemId || !version || !status) {
        return { statusCode: 400, body: JSON.stringify({ error: "itemId, version, and status required" }) };
    }
    if (!["APPROVED", "REJECTED"].includes(status)) {
        return { statusCode: 400, body: JSON.stringify({ error: "Status must be APPROVED or REJECTED" }) };
    }

    try {
        await ddb.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: {
                itemId: { S: itemId },
                version: { N: version.toString() }
            },
            UpdateExpression: "SET #status = :s, reviewer = :r, reviewComment = :c, reviewedAt = :t",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
                ":s": { S: status },
                ":r": { S: reviewer || "unknown" },
                ":c": { S: comment || "" },
                ":t": { S: new Date().toISOString() }
            }
        }));

        return { statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",   // allow all domains
                "Access-Control-Allow-Headers": "*",  // allow any headers
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
            },body: JSON.stringify({ ok: true, itemId, status }) };
    } catch (err) {
        console.error("Error updating item:", err);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",   // allow all domains
                "Access-Control-Allow-Headers": "*",  // allow any headers
                "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
            },
            body: JSON.stringify({
                error: "DynamoDB update failed",
                detail: (err instanceof Error) ? err.message : JSON.stringify(err)
            })
        };
    }
};
