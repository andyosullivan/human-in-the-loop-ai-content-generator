// lambda/randomApproved.ts

import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

// Pull table name from env variable set in CDK
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const STATUS_INDEX = "StatusIndex"; // GSI name from your stack

const ddb = new DynamoDBClient({});

export const handler = async (event: any = {}) => {
    try {
        // Query for APPROVED items in the GSI (you may want to add a filter for latest version)
        const data = await ddb.send(
            new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: STATUS_INDEX,
                KeyConditionExpression: "#status = :approved",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: { ":approved": { S: "APPROVED" } },
                Limit: 100, // Limit to 100 for perf (you can adjust)
                ScanIndexForward: false, // Get latest items first
            })
        );

        const items = (data.Items || []).map((item) => ({
            itemId: item.itemId.S!,
            version: Number(item.version.N!),
            type: item.type.S!,
            lang: item.lang.S!,
            status: item.status.S!,
            createdAt: item.createdAt.S!,
            spec: JSON.parse(item.spec.S!),
        }));

        if (items.length === 0) {
            return {
                statusCode: 404,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "No approved items found" }),
            };
        }

        // Pick a random one!
        const randomIndex = Math.floor(Math.random() * items.length);
        const selected = items[randomIndex];

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(selected),
        };
    } catch (err: any) {
        console.error("Error fetching approved items:", err);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: err.message }),
        };
    }
};
