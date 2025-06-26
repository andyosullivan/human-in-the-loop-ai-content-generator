import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const TABLE_NAME = process.env.PROMPT_CONFIG_TABLE!;
const ddb = new DynamoDBClient({});

export const handler = async () => {
    const res = await ddb.send(new GetItemCommand({
        TableName: TABLE_NAME,
        Key: { pk: { S: "main" } },
        ConsistentRead: true
    }));

    let prompt = "";
    if (res.Item && res.Item.prompt && res.Item.prompt.S) {
        prompt = res.Item.prompt.S;
    }

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
        },
        body: JSON.stringify({ prompt }),
    };
};
