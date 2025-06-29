import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, PutItemCommand, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

// ----- config from env -----
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;
const IMAGE_MODEL_ID = process.env.BEDROCK_IMAGE_MODEL_ID || "amazon.titan-image-generator-v1";
const REGION = process.env.AWS_REGION || "eu-west-1";
const PUZZLE_IMAGES_BUCKET = process.env.PUZZLE_IMAGES_BUCKET!;
const PUZZLE_IMAGES_CLOUDFRONT_URL = process.env.PUZZLE_IMAGES_CLOUDFRONT_URL!;
const PROMPT_CONFIG_TABLE = process.env.PROMPT_CONFIG_TABLE || "PromptConfigTable";

const bedrock = new BedrockRuntimeClient({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

const BACKUP_JIGSAW_IMAGES = [
    "https://d6kwpd0i8hxdp.cloudfront.net/backup-jigsaws/animal1.jpg",
    "https://d6kwpd0i8hxdp.cloudfront.net/backup-jigsaws/animal2.jpg",
    "https://d6kwpd0i8hxdp.cloudfront.net/backup-jigsaws/animal3.jpg",
    "https://d6kwpd0i8hxdp.cloudfront.net/backup-jigsaws/animal4.jpg",
    "https://d6kwpd0i8hxdp.cloudfront.net/backup-jigsaws/animal5.jpg",
];

// ----- schema -----
const INTERACTIVE_ITEM_SCHEMA = `
You must return JSON that validates against this schema:
{
  "$schema":"https://json-schema.org/draft/2020-12/schema",
  "type":"object",
  "required":["id","version","type","lang","status","spec"],
  "properties":{
    "id":{"type":"string","pattern":"^item_[a-f0-9]{8}$"},
    "version":{"type":"integer"},
    "type":{"enum":["word_search","quiz_mcq","memory_match","space_shooter","jigsaw","true_false","odd_one_out"]},
    "lang":{"type":"string"},
    "status":{"enum":["PENDING","APPROVED","REJECTED"]},
    "spec":{"type":"object"}
  }
}
`.trim();

function nowIso() {
    return new Date().toISOString();
}

// --- Prompt loader ---
async function getPromptConfig(): Promise<string> {
    try {
        const res = await ddb.send(new GetItemCommand({
            TableName: PROMPT_CONFIG_TABLE,
            Key: { pk: { S: "main" } }
        }));
        const prompt = res.Item?.prompt?.S;
        if (prompt && prompt.trim().length > 0) return prompt;
    } catch (e) {
        console.error("Error fetching prompt config:", e);
    }
    // Default fallback prompt
    return `
You are an expert puzzle and game JSON generator.

**Return ONLY a single JSON object that validates against this schema:**
${INTERACTIVE_ITEM_SCHEMA}

**Type:** "{{type}}"
**Language:** "{{lang}}"
**Theme:** Choose a fun, general-knowledge theme. For example: animals, sports, history, food, world capitals, movies, science, music, weather, holidays, famous people, technology, etc.

**Difficulty:** "easy"

For each 'type', the "spec" object should follow these patterns:

- **word_search:**
  You are generating a word search puzzle.
  - "grid": A 2D array of 9–12 rows and 9–12 columns. Each cell is a single **uppercase letter**.
  - "words": A list of at least 6 hidden words related to the theme.
  - Place each word **randomly** in one of 8 directions (horizontal, vertical, diagonal, forwards or backwards).
  - Fill all unused cells with random uppercase letters (A–Z)

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

- **true_false:**
  - "questions": array of at least 5 objects. Each object must have:
    - "statement": string (the fact or claim)
    - "answer": boolean (true or false)
    - "explanation": string (short explanation of the answer)

- **odd_one_out:**
  - "rounds": array of at least 5 objects. Each object must have:
    - "options": array of 4 strings (the choices)
    - "answer": integer (the index of the odd one out)
    - "explanation": string (why this is the odd one)

**Strict instructions:**
- Return ONLY the JSON, no markdown, no explanations, no \`\`\` fences, no trailing text.
- Fill in ALL required fields in the "spec" object for the given type—never leave arrays empty or omit fields.
- Use plausible and creative content. If a field is not known, create a realistic placeholder value.
- The JSON **must** be valid and match the required schema and patterns above.

If the type is not recognized, return an object with "status": "REJECTED" and a message in "spec".
`.trim();
}

// --- Jigsaw image generator ---
async function generateAndStoreJigsawImage(promptText: string, itemId: string): Promise<string> {
    const imageRequest = {
        modelId: IMAGE_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            taskType: "TEXT_IMAGE",
            textToImageParams: { text: promptText },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "standard",
                height: 512,
                width: 512,
                cfgScale: 8.0,
                seed: Math.floor(Math.random() * 999999999)
            }
        })
    };
    const imgResponse = await bedrock.send(new InvokeModelCommand(imageRequest));
    const rawImg = new TextDecoder().decode(imgResponse.body);
    const imgPayload = JSON.parse(rawImg);

    const base64Img = Array.isArray(imgPayload.images) ? imgPayload.images[0] : undefined;
    if (!base64Img) {
        console.error("Titan did not return an image. Full payload:", imgPayload);
        throw new Error("No image returned from Titan Image Generator");
    }
    const buffer = Buffer.from(base64Img, "base64");
    const s3Key = `jigsaws/${itemId}.png`;
    await s3.send(new PutObjectCommand({
        Bucket: PUZZLE_IMAGES_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: "image/png"
    }));
    return `${PUZZLE_IMAGES_CLOUDFRONT_URL}/jigsaws/${itemId}.png`;
}

// --- Lambda entry ---
export const handler = async (event: any = {}): Promise<any> => {
    const requestedType = event.type || "word_search";
    const requestedLang = event.lang || "en";

    // 1. Load prompt template (DB or fallback)
    let prompt = await getPromptConfig();
    // 2. Inject current type/lang if used as {{type}}, {{lang}}
    prompt = prompt
        .replace(/\{\{type\}\}/g, requestedType)
        .replace(/\{\{lang\}\}/g, requestedLang);

    const anthropicPayload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        messages: [
            { role: "user", content: prompt }
        ]
    };

    const body = {
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(anthropicPayload)
    };

    // Call Bedrock for the JSON spec
    const response = await bedrock.send(new InvokeModelCommand(body));
    const raw = new TextDecoder().decode(response.body);

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

    // Assign an ID, etc
    const itemId = `item_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
    item.id = itemId;
    item.version = 1;
    item.status = "PENDING";
    item.createdAt = nowIso();

    // If jigsaw, generate/upload AI art or fallback
    if (item.type === "jigsaw") {
        try {
            const promptText = `A bright, fun, detailed illustration of a cute animal OR a fun scene with animals OR a space scene with fun planets and rockets OR a fun image of a boat on the sea. Make sure there are NO words or text in the image.`;
            item.spec.imageUrl = await generateAndStoreJigsawImage(promptText, itemId);
        } catch (err) {
            console.error("Failed to generate/upload jigsaw image:", err);
            item.spec.imageUrl = BACKUP_JIGSAW_IMAGES[Math.floor(Math.random() * BACKUP_JIGSAW_IMAGES.length)];
        }
    }

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

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        },
        body: JSON.stringify({ ok: true, itemId })
    };
};
