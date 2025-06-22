import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = process.env.ANALYTICS_TABLE_NAME!;

export const handler = async () => {
    // NOTE: For large tables, add pagination logic! This is good for up to ~1MB of results.
    const res = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        Limit: 200, // Adjust as needed
    }));

    // Use AWS helper to cleanly convert to plain JS objects
    const items = (res.Items || []).map(item => unmarshall(item));

    // Sort newest first
    items.sort((a, b) => b.ts.localeCompare(a.ts));

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",   // allow all domains
            "Access-Control-Allow-Headers": "*",  // allow any headers
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
        },
        body: JSON.stringify(items),
    };
};