import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

const sfn = new SFNClient();

const ITEM_TYPES = [
    "quiz_mcq",
    "word_search",
    "memory_match",
    "space_shooter",
    "jigsaw",
    "true_false",
    "odd_one_out"
];

export const handler = async (event: any = {}) => {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body || {};
    const { count = 1, type, lang = "en" } = body;

// Helper to pick a random type
    function randomType() {
        return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    }

// Build the items array
    const items = Array.from({ length: count }, () => ({
        type: randomType(),
        lang
    }));

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
