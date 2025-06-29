import {
    SFNClient,
    StartExecutionCommand,
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient();

const ITEM_TYPES = [
    "quiz_mcq",
    "word_search",
    "memory_match",
    "space_shooter",
    "jigsaw",
    "true_false",
    "odd_one_out",
];

function randomType() {
    return ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
}

export const handler = async (event: any = {}) => {
    // parse body (proxy integration safe)
    const body =
        typeof event.body === "string"
            ? JSON.parse(event.body)
            : event.body || {};

    const { count = 1, type, lang = "en" } = body;

    const cleanCount = Math.max(1, Math.min(100, Number(count)));

    // If caller provided a valid type (and not "ALL"), honour it
    const pickedType =
        type && type !== "ALL" && ITEM_TYPES.includes(type)
            ? type
            : undefined;

    const items = Array.from({ length: cleanCount }, () => ({
        type: pickedType ?? randomType(),
        lang,
    }));

    const stateMachineArn = process.env.STATE_MACHINE_ARN!;
    const input = JSON.stringify({ items });

    const result = await sfn.send(
        new StartExecutionCommand({
            stateMachineArn,
            input,
        })
    );

    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ ok: true, executionArn: result.executionArn }),
    };
};
