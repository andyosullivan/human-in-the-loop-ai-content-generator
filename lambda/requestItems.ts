import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfn = new SFNClient();

export const handler = async (event: any = {}) => {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { count = 1, type = "word_search", lang = "en" } = body;

    // Build the items array
    const items = Array.from({ length: count }, () => ({ type, lang }));

    const stateMachineArn = process.env.STATE_MACHINE_ARN!;
    const input = JSON.stringify({ items });

    const command = new StartExecutionCommand({
        stateMachineArn,
        input
    });

    const result = await sfn.send(command);

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ ok: true, executionArn: result.executionArn })
    };
};
