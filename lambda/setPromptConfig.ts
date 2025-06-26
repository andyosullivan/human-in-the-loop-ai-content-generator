import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.PROMPT_CONFIG_TABLE!;
const ddb = new DynamoDBClient({});

export const handler = async (event: any) => {
    let prompt = "";
    try {
        const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
        if (typeof body.prompt !== "string" || body.prompt.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
                },
                body: JSON.stringify({ error: "Missing or invalid 'prompt'." }),
            };
        }
        prompt = body.prompt;
    } catch (e) {
        return {
            statusCode: 400,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
            },
            body: JSON.stringify({ error: "Invalid JSON body." }),
        };
    }

    await ddb.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
            pk: { S: "main" },
            prompt: { S: prompt }
        }
    }));

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
        },
        body: JSON.stringify({ ok: true }),
    };
};