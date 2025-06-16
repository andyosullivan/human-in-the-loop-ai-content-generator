// lambda/generator.ts
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";

// ----- config from env -----
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const MODEL_ID = process.env.BEDROCK_MODEL_ID!; // e.g. "anthropic.claude-3-sonnet-20240229-v1:0"
const REGION = process.env.AWS_REGION || "eu-west-1";

// ----- one-time clients -----
const bedrock = new BedrockRuntimeClient({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });

// ----- schema (trimmed – keep keys in sync with your latest) -----
const INTERACTIVE_ITEM_SCHEMA = /* json */ `
You must return JSON that validates against this schema:
{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "type":"object",
  "required":["id","version","type","lang","status","spec"],
  "properties":{
    "id":{"type":"string","pattern":"^item_[a-f0-9]{8}$"},
    "version":{"type":"integer"},
    "type":{"enum":["word_search","quiz_mcq","memory_match","space_shooter","jigsaw"]},
    "lang":{"type":"string"},
    "status":{"enum":["PENDING","APPROVED","REJECTED"]},
    "spec":{"type":"object"}
  }
}
`.trim();

// -- basic utility ----------------------------------------------------
function nowIso() { return new Date().toISOString(); }

// -- Lambda entry -----------------------------------------------------
export const handler = async (event: any = {}): Promise<any> => {
    /* Choose the item type & language from the request or default */
    const requestedType = event.type || "word_search";
    const requestedLang = event.lang || "en";

    /* prompt */
    const prompt = `
You are an expert puzzle and game JSON generator.

**Return ONLY a single JSON object that validates against this schema:**
${INTERACTIVE_ITEM_SCHEMA}

**Type:** "${requestedType}"
**Language:** "${requestedLang}"
**Theme:** "hackathon-demo"
**Difficulty:** "easy"

For each 'type', the "spec" object should follow these patterns:

- **word_search:**
  - "grid": a 2D array of letters (9–12 rows of 9–12 uppercase letters each)
  - "words": a list of at least 6 hidden words related to the theme

- **quiz_mcq:**
  - "questions": an array of at least 5 objects. Each object must have:
    - "question": string
    - "choices": array of 4 strings
    - "answer": integer (the index of the correct answer in "choices")

- **memory_match:**
  - "pairs": an array of at least 6 objects, each with:
    - "term": string (e.g. a word or image)
    - "match": string (the correct pair for "term")

- **space_shooter:**
  - "level": integer (difficulty level, 1–5)
  - "enemyTypes": array of at least 3 enemy names as strings
  - "playerAbilities": array of at least 2 abilities as strings

- **jigsaw:**
  - "imageUrl": a plausible image URL string (use a placeholder like "https://example.com/jigsaw1.png")
  - "pieces": integer (number of pieces, 12–48)

**Strict instructions:**
- Return ONLY the JSON, no markdown, no explanations, no \`\`\` fences, no trailing text.
- Fill in ALL required fields in the "spec" object for the given type—never leave arrays empty or omit fields.
- Use plausible and creative content. If a field is not known, create a realistic placeholder value.
- The JSON **must** be valid and match the required schema and patterns above.

If the type is not recognized, return an object with "status": "REJECTED" and a message in "spec".
`;


    /* Bedrock Anthropic Claude 3.5/3 Sonnet message format */
    const anthropicPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [
            {
                role: "user",
                content: prompt
            }
        ]
    };

    const body = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(anthropicPayload)
    };

    /* Call Bedrock */
    const response = await bedrock.send(new InvokeModelCommand(body));
    const raw = new TextDecoder().decode(response.body);



    // Strip out any preamble if present (Claude sometimes returns extra text)
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    let item;
    try {
        const outer = JSON.parse(raw);
        const jsonStr = outer?.content?.[0]?.text;
        item = JSON.parse(jsonStr);
    } catch (err) {
        console.error("Could not extract puzzle JSON from Claude response:", raw);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Claude output not valid JSON", raw })
        };
    }

    console.log("RAW Bedrock output:", raw);
    console.log("PARSED Bedrock item:", item);

    /* Post-process: add id, timestamps, status */
    const itemId = `item_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
    item.id = itemId;
    item.version = 1;
    item.status = "PENDING";
    item.createdAt = nowIso();

    /* Store in DynamoDB */
    if (!item || !item.type || !item.lang || !item.spec) {
        console.error("Incomplete item from Bedrock:", item);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Claude output incomplete", detail: item })
        };
    }


    await ddb.send(new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
            itemId: { S: item.id },
            version: { N: item.version.toString() },
            type: { S: item.type },
            status: { S: item.status },
            lang: { S: item.lang },
            createdAt: { S: item.createdAt },
            spec: { S: JSON.stringify(item.spec) }
        }
    }));

    /* Return result to caller */
    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",   // allow all domains
            "Access-Control-Allow-Headers": "*",  // allow any headers
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
        },
        body: JSON.stringify({ ok: true, itemId })
    };
};
