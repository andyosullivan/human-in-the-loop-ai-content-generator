import {
    BedrockRuntimeClient,
    InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
    DynamoDBClient,
    PutItemCommand,
    GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";
import { Buffer } from "buffer";

// ----- config from env -----
const TABLE_NAME = process.env.ITEMS_TABLE_NAME!;
const MODEL_ID = process.env.BEDROCK_MODEL_ID!;
const IMAGE_MODEL_ID =
    process.env.BEDROCK_IMAGE_MODEL_ID || "amazon.titan-image-generator-v1";
const REGION = process.env.AWS_REGION || "eu-west-1";
const PUZZLE_IMAGES_BUCKET = process.env.PUZZLE_IMAGES_BUCKET!;
const PUZZLE_IMAGES_CLOUDFRONT_URL =
    process.env.PUZZLE_IMAGES_CLOUDFRONT_URL!;
const PROMPT_CONFIG_TABLE =
    process.env.PROMPT_CONFIG_TABLE || "PromptConfigTable";

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

// ---------- square-grid helper (≈40 lines) ----------
type Dir = [number, number];
const DIRS: Dir[] = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
];

function buildWordSearch(
    rawWords: string[],
    size = 9 + Math.floor(Math.random() * 4) // 9–12
) {
    const grid: string[][] = Array.from({ length: size }, () =>
        Array.from({ length: size }, () => "")
    );

    const words = rawWords
        .map((w) => w.replace(/[^A-Z]/gi, "").toUpperCase())
        .filter((w) => w.length >= 3 && w.length <= size);

    function fits(word: string, r: number, c: number, [dr, dc]: Dir) {
        const endR = r + dr * (word.length - 1);
        const endC = c + dc * (word.length - 1);
        if (endR < 0 || endR >= size || endC < 0 || endC >= size) return false;
        for (let k = 0; k < word.length; k++) {
            const ch = grid[r + k * dr][c + k * dc];
            if (ch && ch !== word[k]) return false;
        }
        return true;
    }

    function place(word: string) {
        for (let t = 0; t < 250; t++) {
            const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
            const r = Math.floor(Math.random() * size);
            const c = Math.floor(Math.random() * size);
            if (fits(word, r, c, dir)) {
                for (let k = 0; k < word.length; k++) {
                    grid[r + k * dir[0]][c + k * dir[1]] = word[k];
                }
                return;
            }
        }
    }

    words.forEach(place);

    // fill blanks
    for (let r = 0; r < size; r++)
        for (let c = 0; c < size; c++)
            if (!grid[r][c])
                grid[r][c] = String.fromCharCode(
                    65 + Math.floor(Math.random() * 26)
                );

    return { grid, words };
}

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

const nowIso = () => new Date().toISOString();

// --- Prompt loader (unchanged) ---
async function getPromptConfig(): Promise<string> {
    try {
        const res = await ddb.send(
            new GetItemCommand({
                TableName: PROMPT_CONFIG_TABLE,
                Key: { pk: { S: "main" } },
            })
        );
        const prompt = res.Item?.prompt?.S;
        if (prompt?.trim()) return prompt;
    } catch (e) {
        console.error("Error fetching prompt config:", e);
    }
    // Default fallback prompt (UNCHANGED)
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

// --- Jigsaw image generator (unchanged) ---
async function generateAndStoreJigsawImage(
    promptText: string,
    itemId: string
): Promise<string> {
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
                seed: Math.floor(Math.random() * 999999999),
            },
        }),
    };
    const imgResponse = await bedrock.send(new InvokeModelCommand(imageRequest));
    const rawImg = new TextDecoder().decode(imgResponse.body);
    const imgPayload = JSON.parse(rawImg);
    const base64Img = Array.isArray(imgPayload.images)
        ? imgPayload.images[0]
        : undefined;
    if (!base64Img) throw new Error("No image from Titan");
    const buffer = Buffer.from(base64Img, "base64");
    const s3Key = `jigsaws/${itemId}.png`;
    await s3.send(
        new PutObjectCommand({
            Bucket: PUZZLE_IMAGES_BUCKET,
            Key: s3Key,
            Body: buffer,
            ContentType: "image/png",
        })
    );
    return `${PUZZLE_IMAGES_CLOUDFRONT_URL}/jigsaws/${itemId}.png`;
}

// --- Lambda entry ---
export const handler = async (event: any = {}) => {
    /* ── NEW: show what we actually received ── */
    console.log("RAW event ➜", JSON.stringify(event));

    /* If API Gateway/StepFn delivered the body as a JSON string, parse it */
    const req = typeof event === "string"
        ? JSON.parse(event)
        : event.body && typeof event.body === "string"
            ? JSON.parse(event.body)
            : event;

    const requestedType = event.type || "word_search";
    const requestedLang = event.lang || "en";

    console.log("requestedType ➜", requestedType);
    // 1. load prompt
    let prompt = await getPromptConfig();
    prompt = prompt
        .replace(/\{\{type\}\}/g, requestedType)
        .replace(/\{\{lang\}\}/g, requestedLang);

    // 2. call Claude
    const response = await bedrock.send(
        new InvokeModelCommand({
            modelId: MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify({
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 1024,
                messages: [{ role: "user", content: prompt }],
            }),
        })
    );
    const raw = new TextDecoder().decode(response.body);

    // 3. parse Claude JSON
    let item: any;
    try {
        const outer = JSON.parse(raw);
        item = JSON.parse(outer?.content?.[0]?.text || "{}");
    } catch {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Claude output not valid JSON", raw }),
        };
    }

    // 4. for word_search, build grid locally
    if (item.type === "word_search") {
        const { grid, words } = buildWordSearch(item.spec.words || []);
        item.spec.grid = grid;
        item.spec.words = words;
    }

    // 5. jigsaw image (unchanged)
    if (item.type === "jigsaw") {
        const imgPrompt =
            "A bright, fun, detailed animal or space illustration, no text";
        try {
            item.spec.imageUrl = await generateAndStoreJigsawImage(
                imgPrompt,
                "tmp_" + uuidv4().slice(0, 8)
            );
        } catch {
            item.spec.imageUrl =
                BACKUP_JIGSAW_IMAGES[
                    Math.floor(Math.random() * BACKUP_JIGSAW_IMAGES.length)
                    ];
        }
    }

    // 6. metadata & save
    const itemId = `item_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
    item.id = itemId;
    item.version = 1;
    item.status = "PENDING";
    item.createdAt = nowIso();

    await ddb.send(
        new PutItemCommand({
            TableName: TABLE_NAME,
            Item: {
                itemId: { S: item.id },
                version: { N: String(item.version) },
                type: { S: item.type },
                status: { S: item.status },
                lang: { S: item.lang },
                createdAt: { S: item.createdAt },
                spec: { S: JSON.stringify(item.spec) },
            },
        })
    );

    return {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
        },
        body: JSON.stringify({ ok: true, itemId }),
    };
};
