import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

const ddb = new DynamoDBClient({});
const TABLE_NAME = process.env.ANALYTICS_TABLE_NAME!;

export const handler = async (event: any) => {
    let body;
    try {
        body = JSON.parse(event.body || "{}");
    } catch {
        return { statusCode: 400, body: "Bad request" };
    }

    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    const date = timestamp.split("T")[0];
    const pk = `date#${date}`;
    const sk = `event#${eventId}`;

    await ddb.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
            pk: { S: pk },
            sk: { S: sk },
            eventType: { S: body.type || "unknown" },
            gameType: { S: body.gameType || "unknown" },
            ts: { S: timestamp },
            ...(body.meta ? { meta: { S: JSON.stringify(body.meta) } } : {})
        }
    }));

    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true })
    };
};
