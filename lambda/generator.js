"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/generator.ts
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const buffer_1 = require("buffer");
// ----- config from env -----
const TABLE_NAME = process.env.ITEMS_TABLE_NAME;
const MODEL_ID = process.env.BEDROCK_MODEL_ID; // e.g. "anthropic.claude-3-sonnet-20240229-v1:0"
const IMAGE_MODEL_ID = process.env.BEDROCK_IMAGE_MODEL_ID || "amazon.titan-image-generator-v1"; // <-- add this env
const REGION = process.env.AWS_REGION || "eu-west-1";
const PUZZLE_IMAGES_BUCKET = process.env.PUZZLE_IMAGES_BUCKET;
// ----- one-time clients -----
const bedrock = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: REGION });
const ddb = new client_dynamodb_1.DynamoDBClient({ region: REGION });
const s3 = new client_s3_1.S3Client({ region: REGION });
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
// -- Generate an image with Bedrock and upload to S3 --
async function generateAndStoreJigsawImage(promptText, itemId) {
    // 1. Call Bedrock Titan image model
    const imageRequest = {
        modelId: IMAGE_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            taskType: "TEXT_IMAGE",
            textToImageParams: { text: promptText },
            imageGenerationConfig: {
                numberOfImages: 1,
                quality: "standard", // You can use "premium" if you have access
                height: 512,
                width: 512,
                cfgScale: 8.0,
                seed: Math.floor(Math.random() * 999999999)
            }
        })
    };
    const imgResponse = await bedrock.send(new client_bedrock_runtime_1.InvokeModelCommand(imageRequest));
    const rawImg = new TextDecoder().decode(imgResponse.body);
    const imgPayload = JSON.parse(rawImg);
    // Titan returns images[0].base64
    const base64Img = Array.isArray(imgPayload.images) ? imgPayload.images[0] : undefined;
    if (!base64Img) {
        console.error("Titan did not return an image. Full payload:", imgPayload);
        throw new Error("No image returned from Titan Image Generator");
    }
    // 2. Upload to S3
    const buffer = buffer_1.Buffer.from(base64Img, "base64");
    const s3Key = `jigsaws/${itemId}.png`;
    await s3.send(new client_s3_1.PutObjectCommand({
        Bucket: PUZZLE_IMAGES_BUCKET,
        Key: s3Key,
        Body: buffer,
        ContentType: "image/png"
        // No ACL!
    }));
    // 3. Return the public URL
    return `https://${PUZZLE_IMAGES_BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;
}
// -- Lambda entry -----------------------------------------------------
const handler = async (event = {}) => {
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
    // Call Bedrock for the JSON spec
    const response = await bedrock.send(new client_bedrock_runtime_1.InvokeModelCommand(body));
    const raw = new TextDecoder().decode(response.body);
    // Parse Claude's response (as before)
    let item;
    try {
        const outer = JSON.parse(raw);
        const jsonStr = outer?.content?.[0]?.text;
        item = JSON.parse(jsonStr);
    }
    catch (err) {
        console.error("Could not extract puzzle JSON from Claude response:", raw);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Claude output not valid JSON", raw })
        };
    }
    // Assign an ID, etc
    const itemId = `item_${(0, uuid_1.v4)().replace(/-/g, "").slice(0, 8)}`;
    item.id = itemId;
    item.version = 1;
    item.status = "PENDING";
    item.createdAt = nowIso();
    // If jigsaw, generate and upload AI art!
    if (item.type === "jigsaw") {
        try {
            // Make a nice puzzle prompt:
            const theme = item?.spec?.theme || "colorful puzzle for a game";
            const pieces = item?.spec?.pieces || 24;
            const promptText = `A bright, fun, detailed illustration of a cute animal for a ${pieces}-piece jigsaw puzzle, for a kids/family game. Make sure there are NO words or text in the image.`;
            // This call may take ~10 seconds!
            const imgUrl = await generateAndStoreJigsawImage(promptText, itemId);
            item.spec.imageUrl = imgUrl;
        }
        catch (err) {
            console.error("Failed to generate/upload jigsaw image:", err);
            // fallback to placeholder
            item.spec.imageUrl = "https://picsum.photos/400/300";
        }
    }
    /* Store in DynamoDB */
    if (!item || !item.type || !item.lang || !item.spec) {
        console.error("Incomplete item from Bedrock:", item);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Claude output incomplete", detail: item })
        };
    }
    await ddb.send(new client_dynamodb_1.PutItemCommand({
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
            "Access-Control-Allow-Origin": "*", // allow all domains
            "Access-Control-Allow-Headers": "*", // allow any headers
            "Access-Control-Allow-Methods": "OPTIONS,POST,GET" // allow these methods
        },
        body: JSON.stringify({ ok: true, itemId })
    };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNCQUFzQjtBQUN0Qiw0RUFBMkY7QUFDM0YsOERBQTBFO0FBQzFFLGtEQUFnRTtBQUNoRSwrQkFBb0M7QUFDcEMsbUNBQWdDO0FBRWhDLDhCQUE4QjtBQUM5QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFpQixDQUFDO0FBQ2pELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWlCLENBQUMsQ0FBQyxpREFBaUQ7QUFDakcsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxpQ0FBaUMsQ0FBQyxDQUFDLG1CQUFtQjtBQUNuSCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFxQixDQUFDO0FBRS9ELCtCQUErQjtBQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFJLDZDQUFvQixDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDN0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDbkQsTUFBTSxFQUFFLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFHNUMsb0VBQW9FO0FBQ3BFLE1BQU0sdUJBQXVCLEdBQUcsVUFBVSxDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Q0FlMUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUVULHdFQUF3RTtBQUN4RSxTQUFTLE1BQU0sS0FBSyxPQUFPLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxD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c291cmNlc0NvbnRlbnQiOlsiLy8gbGFtYmRhL2dlbmVyYXRvci50c1xuaW1wb3J0IHsgQmVkcm9ja1J1bnRpbWVDbGllbnQsIEludm9rZU1vZGVsQ29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lXCI7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiXCI7XG5pbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtczNcIjtcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gXCJ1dWlkXCI7XG5pbXBvcnQgeyBCdWZmZXIgfSBmcm9tIFwiYnVmZmVyXCI7XG5cbi8vIC0tLS0tIGNvbmZpZyBmcm9tIGVudiAtLS0tLVxuY29uc3QgVEFCTEVfTkFNRSA9IHByb2Nlc3MuZW52LklURU1TX1RBQkxFX05BTUUhO1xuY29uc3QgTU9ERUxfSUQgPSBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEITsgLy8gZS5nLiBcImFudGhyb3BpYy5jbGF1ZGUtMy1zb25uZXQtMjAyNDAyMjktdjE6MFwiXG5jb25zdCBJTUFHRV9NT0RFTF9JRCA9IHByb2Nlc3MuZW52LkJFRFJPQ0tfSU1BR0VfTU9ERUxfSUQgfHwgXCJhbWF6b24udGl0YW4taW1hZ2UtZ2VuZXJhdG9yLXYxXCI7IC8vIDwtLSBhZGQgdGhpcyBlbnZcbmNvbnN0IFJFR0lPTiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgXCJldS13ZXN0LTFcIjtcbmNvbnN0IFBVWlpMRV9JTUFHRVNfQlVDS0VUID0gcHJvY2Vzcy5lbnYuUFVaWkxFX0lNQUdFU19CVUNLRVQhO1xuXG4vLyAtLS0tLSBvbmUtdGltZSBjbGllbnRzIC0tLS0tXG5jb25zdCBiZWRyb2NrID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBSRUdJT04gfSk7XG5jb25zdCBkZGIgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IFJFR0lPTiB9KTtcbmNvbnN0IHMzID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBSRUdJT04gfSk7XG5cblxuLy8gLS0tLS0gc2NoZW1hICh0cmltbWVkIOKAkyBrZWVwIGtleXMgaW4gc3luYyB3aXRoIHlvdXIgbGF0ZXN0KSAtLS0tLVxuY29uc3QgSU5URVJBQ1RJVkVfSVRFTV9TQ0hFTUEgPSAvKiBqc29uICovIGBcbllvdSBtdXN0IHJldHVybiBKU09OIHRoYXQgdmFsaWRhdGVzIGFnYWluc3QgdGhpcyBzY2hlbWE6XG57XG4gIFwiJHNjaGVtYVwiOlwiaHR0cHM6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQvMjAyMC0xMi9zY2hlbWFcIixcbiAgXCJ0eXBlXCI6XCJvYmplY3RcIixcbiAgXCJyZXF1aXJlZFwiOltcImlkXCIsXCJ2ZXJzaW9uXCIsXCJ0eXBlXCIsXCJsYW5nXCIsXCJzdGF0dXNcIixcInNwZWNcIl0sXG4gIFwicHJvcGVydGllc1wiOntcbiAgICBcImlkXCI6e1widHlwZVwiOlwic3RyaW5nXCIsXCJwYXR0ZXJuXCI6XCJeaXRlbV9bYS1mMC05XXs4fSRcIn0sXG4gICAgXCJ2ZXJzaW9uXCI6e1widHlwZVwiOlwiaW50ZWdlclwifSxcbiAgICBcInR5cGVcIjp7XCJlbnVtXCI6W1wid29yZF9zZWFyY2hcIixcInF1aXpfbWNxXCIsXCJtZW1vcnlfbWF0Y2hcIixcInNwYWNlX3Nob290ZXJcIixcImppZ3Nhd1wiXX0sXG4gICAgXCJsYW5nXCI6e1widHlwZVwiOlwic3RyaW5nXCJ9LFxuICAgIFwic3RhdHVzXCI6e1wiZW51bVwiOltcIlBFTkRJTkdcIixcIkFQUFJPVkVEXCIsXCJSRUpFQ1RFRFwiXX0sXG4gICAgXCJzcGVjXCI6e1widHlwZVwiOlwib2JqZWN0XCJ9XG4gIH1cbn1cbmAudHJpbSgpO1xuXG4vLyAtLSBiYXNpYyB1dGlsaXR5IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIG5vd0lzbygpIHsgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfVxuXG4vLyAtLSBHZW5lcmF0ZSBhbiBpbWFnZSB3aXRoIEJlZHJvY2sgYW5kIHVwbG9hZCB0byBTMyAtLVxuYXN5bmMgZnVuY3Rpb24gZ2VuZXJhdGVBbmRTdG9yZUppZ3Nhd0ltYWdlKHByb21wdFRleHQ6IHN0cmluZywgaXRlbUlkOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIC8vIDEuIENhbGwgQmVkcm9jayBUaXRhbiBpbWFnZSBtb2RlbFxuICAgIGNvbnN0IGltYWdlUmVxdWVzdCA9IHtcbiAgICAgICAgbW9kZWxJZDogSU1BR0VfTU9ERUxfSUQsXG4gICAgICAgIGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgdGFza1R5cGU6IFwiVEVYVF9JTUFHRVwiLFxuICAgICAgICAgICAgdGV4dFRvSW1hZ2VQYXJhbXM6IHsgdGV4dDogcHJvbXB0VGV4dCB9LFxuICAgICAgICAgICAgaW1hZ2VHZW5lcmF0aW9uQ29uZmlnOiB7XG4gICAgICAgICAgICAgICAgbnVtYmVyT2ZJbWFnZXM6IDEsXG4gICAgICAgICAgICAgICAgcXVhbGl0eTogXCJzdGFuZGFyZFwiLCAgICAgLy8gWW91IGNhbiB1c2UgXCJwcmVtaXVtXCIgaWYgeW91IGhhdmUgYWNjZXNzXG4gICAgICAgICAgICAgICAgaGVpZ2h0OiA1MTIsXG4gICAgICAgICAgICAgICAgd2lkdGg6IDUxMixcbiAgICAgICAgICAgICAgICBjZmdTY2FsZTogOC4wLFxuICAgICAgICAgICAgICAgIHNlZWQ6IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDk5OTk5OTk5OSlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9O1xuXG4gICAgY29uc3QgaW1nUmVzcG9uc2UgPSBhd2FpdCBiZWRyb2NrLnNlbmQobmV3IEludm9rZU1vZGVsQ29tbWFuZChpbWFnZVJlcXVlc3QpKTtcbiAgICBjb25zdCByYXdJbWcgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoaW1nUmVzcG9uc2UuYm9keSk7XG4gICAgY29uc3QgaW1nUGF5bG9hZCA9IEpTT04ucGFyc2UocmF3SW1nKTtcblxuICAgIC8vIFRpdGFuIHJldHVybnMgaW1hZ2VzWzBdLmJhc2U2NFxuICAgIGNvbnN0IGJhc2U2NEltZyA9IEFycmF5LmlzQXJyYXkoaW1nUGF5bG9hZC5pbWFnZXMpID8gaW1nUGF5bG9hZC5pbWFnZXNbMF0gOiB1bmRlZmluZWQ7XG4gICAgaWYgKCFiYXNlNjRJbWcpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIlRpdGFuIGRpZCBub3QgcmV0dXJuIGFuIGltYWdlLiBGdWxsIHBheWxvYWQ6XCIsIGltZ1BheWxvYWQpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJObyBpbWFnZSByZXR1cm5lZCBmcm9tIFRpdGFuIEltYWdlIEdlbmVyYXRvclwiKTtcbiAgICB9XG5cbiAgICAvLyAyLiBVcGxvYWQgdG8gUzNcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuZnJvbShiYXNlNjRJbWcsIFwiYmFzZTY0XCIpO1xuICAgIGNvbnN0IHMzS2V5ID0gYGppZ3Nhd3MvJHtpdGVtSWR9LnBuZ2A7XG5cbiAgICBhd2FpdCBzMy5zZW5kKG5ldyBQdXRPYmplY3RDb21tYW5kKHtcbiAgICAgICAgQnVja2V0OiBQVVpaTEVfSU1BR0VTX0JVQ0tFVCxcbiAgICAgICAgS2V5OiBzM0tleSxcbiAgICAgICAgQm9keTogYnVmZmVyLFxuICAgICAgICBDb250ZW50VHlwZTogXCJpbWFnZS9wbmdcIlxuICAgICAgICAvLyBObyBBQ0whXG4gICAgfSkpO1xuXG4gICAgLy8gMy4gUmV0dXJuIHRoZSBwdWJsaWMgVVJMXG4gICAgcmV0dXJuIGBodHRwczovLyR7UFVaWkxFX0lNQUdFU19CVUNLRVR9LnMzLiR7UkVHSU9OfS5hbWF6b25hd3MuY29tLyR7czNLZXl9YDtcbn1cblxuXG4vLyAtLSBMYW1iZGEgZW50cnkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBhbnkgPSB7fSk6IFByb21pc2U8YW55PiA9PiB7XG4gICAgLyogQ2hvb3NlIHRoZSBpdGVtIHR5cGUgJiBsYW5ndWFnZSBmcm9tIHRoZSByZXF1ZXN0IG9yIGRlZmF1bHQgKi9cbiAgICBjb25zdCByZXF1ZXN0ZWRUeXBlID0gZXZlbnQudHlwZSB8fCBcIndvcmRfc2VhcmNoXCI7XG4gICAgY29uc3QgcmVxdWVzdGVkTGFuZyA9IGV2ZW50LmxhbmcgfHwgXCJlblwiO1xuXG4gICAgLyogcHJvbXB0ICovXG4gICAgY29uc3QgcHJvbXB0ID0gYFxuWW91IGFyZSBhbiBleHBlcnQgcHV6emxlIGFuZCBnYW1lIEpTT04gZ2VuZXJhdG9yLlxuXG4qKlJldHVybiBPTkxZIGEgc2luZ2xlIEpTT04gb2JqZWN0IHRoYXQgdmFsaWRhdGVzIGFnYWluc3QgdGhpcyBzY2hlbWE6KipcbiR7SU5URVJBQ1RJVkVfSVRFTV9TQ0hFTUF9XG5cbioqVHlwZToqKiBcIiR7cmVxdWVzdGVkVHlwZX1cIlxuKipMYW5ndWFnZToqKiBcIiR7cmVxdWVzdGVkTGFuZ31cIlxuKipUaGVtZToqKiBcImhhY2thdGhvbi1kZW1vXCJcbioqRGlmZmljdWx0eToqKiBcImVhc3lcIlxuXG5Gb3IgZWFjaCAndHlwZScsIHRoZSBcInNwZWNcIiBvYmplY3Qgc2hvdWxkIGZvbGxvdyB0aGVzZSBwYXR0ZXJuczpcblxuLSAqKndvcmRfc2VhcmNoOioqXG4gIC0gXCJncmlkXCI6IGEgMkQgYXJyYXkgb2YgbGV0dGVycyAoOeKAkzEyIHJvd3Mgb2YgOeKAkzEyIHVwcGVyY2FzZSBsZXR0ZXJzIGVhY2gpXG4gIC0gXCJ3b3Jkc1wiOiBhIGxpc3Qgb2YgYXQgbGVhc3QgNiBoaWRkZW4gd29yZHMgcmVsYXRlZCB0byB0aGUgdGhlbWVcblxuLSAqKnF1aXpfbWNxOioqXG4gIC0gXCJxdWVzdGlvbnNcIjogYW4gYXJyYXkgb2YgYXQgbGVhc3QgNSBvYmplY3RzLiBFYWNoIG9iamVjdCBtdXN0IGhhdmU6XG4gICAgLSBcInF1ZXN0aW9uXCI6IHN0cmluZ1xuICAgIC0gXCJjaG9pY2VzXCI6IGFycmF5IG9mIDQgc3RyaW5nc1xuICAgIC0gXCJhbnN3ZXJcIjogaW50ZWdlciAodGhlIGluZGV4IG9mIHRoZSBjb3JyZWN0IGFuc3dlciBpbiBcImNob2ljZXNcIilcblxuLSAqKm1lbW9yeV9tYXRjaDoqKlxuICAtIFwicGFpcnNcIjogYW4gYXJyYXkgb2YgYXQgbGVhc3QgNiBvYmplY3RzLCBlYWNoIHdpdGg6XG4gICAgLSBcInRlcm1cIjogc3RyaW5nIChlLmcuIGEgd29yZCBvciBpbWFnZSlcbiAgICAtIFwibWF0Y2hcIjogc3RyaW5nICh0aGUgY29ycmVjdCBwYWlyIGZvciBcInRlcm1cIilcblxuLSAqKnNwYWNlX3Nob290ZXI6KipcbiAgLSBcImxldmVsXCI6IGludGVnZXIgKGRpZmZpY3VsdHkgbGV2ZWwsIDHigJM1KVxuICAtIFwiZW5lbXlUeXBlc1wiOiBhcnJheSBvZiBhdCBsZWFzdCAzIGVuZW15IG5hbWVzIGFzIHN0cmluZ3NcbiAgLSBcInBsYXllckFiaWxpdGllc1wiOiBhcnJheSBvZiBhdCBsZWFzdCAyIGFiaWxpdGllcyBhcyBzdHJpbmdzXG5cbi0gKipqaWdzYXc6KipcbiAgLSBcImltYWdlVXJsXCI6IGEgcGxhdXNpYmxlIGltYWdlIFVSTCBzdHJpbmcgKHVzZSBhIHBsYWNlaG9sZGVyIGxpa2UgXCJodHRwczovL2V4YW1wbGUuY29tL2ppZ3NhdzEucG5nXCIpXG4gIC0gXCJwaWVjZXNcIjogaW50ZWdlciAobnVtYmVyIG9mIHBpZWNlcywgMTLigJM0OClcblxuKipTdHJpY3QgaW5zdHJ1Y3Rpb25zOioqXG4tIFJldHVybiBPTkxZIHRoZSBKU09OLCBubyBtYXJrZG93biwgbm8gZXhwbGFuYXRpb25zLCBubyBcXGBcXGBcXGAgZmVuY2VzLCBubyB0cmFpbGluZyB0ZXh0LlxuLSBGaWxsIGluIEFMTCByZXF1aXJlZCBmaWVsZHMgaW4gdGhlIFwic3BlY1wiIG9iamVjdCBmb3IgdGhlIGdpdmVuIHR5cGXigJRuZXZlciBsZWF2ZSBhcnJheXMgZW1wdHkgb3Igb21pdCBmaWVsZHMuXG4tIFVzZSBwbGF1c2libGUgYW5kIGNyZWF0aXZlIGNvbnRlbnQuIElmIGEgZmllbGQgaXMgbm90IGtub3duLCBjcmVhdGUgYSByZWFsaXN0aWMgcGxhY2Vob2xkZXIgdmFsdWUuXG4tIFRoZSBKU09OICoqbXVzdCoqIGJlIHZhbGlkIGFuZCBtYXRjaCB0aGUgcmVxdWlyZWQgc2NoZW1hIGFuZCBwYXR0ZXJucyBhYm92ZS5cblxuSWYgdGhlIHR5cGUgaXMgbm90IHJlY29nbml6ZWQsIHJldHVybiBhbiBvYmplY3Qgd2l0aCBcInN0YXR1c1wiOiBcIlJFSkVDVEVEXCIgYW5kIGEgbWVzc2FnZSBpbiBcInNwZWNcIi5cbmA7XG5cblxuICAgIGNvbnN0IGFudGhyb3BpY1BheWxvYWQgPSB7XG4gICAgICAgIGFudGhyb3BpY192ZXJzaW9uOiBcImJlZHJvY2stMjAyMy0wNS0zMVwiLFxuICAgICAgICBtYXhfdG9rZW5zOiAxMDI0LFxuICAgICAgICBtZXNzYWdlczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHJvbGU6IFwidXNlclwiLFxuICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHByb21wdFxuICAgICAgICAgICAgfVxuICAgICAgICBdXG4gICAgfTtcblxuICAgIGNvbnN0IGJvZHkgPSB7XG4gICAgICAgIG1vZGVsSWQ6IE1PREVMX0lELFxuICAgICAgICBjb250ZW50VHlwZTogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGFjY2VwdDogXCJhcHBsaWNhdGlvbi9qc29uXCIsXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGFudGhyb3BpY1BheWxvYWQpXG4gICAgfTtcblxuICAgIC8vIENhbGwgQmVkcm9jayBmb3IgdGhlIEpTT04gc3BlY1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgYmVkcm9jay5zZW5kKG5ldyBJbnZva2VNb2RlbENvbW1hbmQoYm9keSkpO1xuICAgIGNvbnN0IHJhdyA9IG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShyZXNwb25zZS5ib2R5KTtcblxuICAgIC8vIFBhcnNlIENsYXVkZSdzIHJlc3BvbnNlIChhcyBiZWZvcmUpXG4gICAgbGV0IGl0ZW07XG4gICAgdHJ5IHtcbiAgICAgICAgY29uc3Qgb3V0ZXIgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgICAgIGNvbnN0IGpzb25TdHIgPSBvdXRlcj8uY29udGVudD8uWzBdPy50ZXh0O1xuICAgICAgICBpdGVtID0gSlNPTi5wYXJzZShqc29uU3RyKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkNvdWxkIG5vdCBleHRyYWN0IHB1enpsZSBKU09OIGZyb20gQ2xhdWRlIHJlc3BvbnNlOlwiLCByYXcpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJDbGF1ZGUgb3V0cHV0IG5vdCB2YWxpZCBKU09OXCIsIHJhdyB9KVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIEFzc2lnbiBhbiBJRCwgZXRjXG4gICAgY29uc3QgaXRlbUlkID0gYGl0ZW1fJHt1dWlkdjQoKS5yZXBsYWNlKC8tL2csIFwiXCIpLnNsaWNlKDAsIDgpfWA7XG4gICAgaXRlbS5pZCA9IGl0ZW1JZDtcbiAgICBpdGVtLnZlcnNpb24gPSAxO1xuICAgIGl0ZW0uc3RhdHVzID0gXCJQRU5ESU5HXCI7XG4gICAgaXRlbS5jcmVhdGVkQXQgPSBub3dJc28oKTtcblxuICAgIC8vIElmIGppZ3NhdywgZ2VuZXJhdGUgYW5kIHVwbG9hZCBBSSBhcnQhXG4gICAgaWYgKGl0ZW0udHlwZSA9PT0gXCJqaWdzYXdcIikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gTWFrZSBhIG5pY2UgcHV6emxlIHByb21wdDpcbiAgICAgICAgICAgIGNvbnN0IHRoZW1lID0gaXRlbT8uc3BlYz8udGhlbWUgfHwgXCJjb2xvcmZ1bCBwdXp6bGUgZm9yIGEgZ2FtZVwiO1xuICAgICAgICAgICAgY29uc3QgcGllY2VzID0gaXRlbT8uc3BlYz8ucGllY2VzIHx8IDI0O1xuICAgICAgICAgICAgY29uc3QgcHJvbXB0VGV4dCA9IGBBIGJyaWdodCwgZnVuLCBkZXRhaWxlZCBpbGx1c3RyYXRpb24gb2YgYSBjdXRlIGFuaW1hbCBmb3IgYSAke3BpZWNlc30tcGllY2Ugamlnc2F3IHB1enpsZSwgZm9yIGEga2lkcy9mYW1pbHkgZ2FtZS4gTWFrZSBzdXJlIHRoZXJlIGFyZSBOTyB3b3JkcyBvciB0ZXh0IGluIHRoZSBpbWFnZS5gO1xuICAgICAgICAgICAgLy8gVGhpcyBjYWxsIG1heSB0YWtlIH4xMCBzZWNvbmRzIVxuICAgICAgICAgICAgY29uc3QgaW1nVXJsID0gYXdhaXQgZ2VuZXJhdGVBbmRTdG9yZUppZ3Nhd0ltYWdlKHByb21wdFRleHQsIGl0ZW1JZCk7XG4gICAgICAgICAgICBpdGVtLnNwZWMuaW1hZ2VVcmwgPSBpbWdVcmw7XG4gICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIkZhaWxlZCB0byBnZW5lcmF0ZS91cGxvYWQgamlnc2F3IGltYWdlOlwiLCBlcnIpO1xuICAgICAgICAgICAgLy8gZmFsbGJhY2sgdG8gcGxhY2Vob2xkZXJcbiAgICAgICAgICAgIGl0ZW0uc3BlYy5pbWFnZVVybCA9IFwiaHR0cHM6Ly9waWNzdW0ucGhvdG9zLzQwMC8zMDBcIjtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qIFN0b3JlIGluIER5bmFtb0RCICovXG4gICAgaWYgKCFpdGVtIHx8ICFpdGVtLnR5cGUgfHwgIWl0ZW0ubGFuZyB8fCAhaXRlbS5zcGVjKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCJJbmNvbXBsZXRlIGl0ZW0gZnJvbSBCZWRyb2NrOlwiLCBpdGVtKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFwiQ2xhdWRlIG91dHB1dCBpbmNvbXBsZXRlXCIsIGRldGFpbDogaXRlbSB9KVxuICAgICAgICB9O1xuICAgIH1cblxuXG4gICAgYXdhaXQgZGRiLnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBUQUJMRV9OQU1FLFxuICAgICAgICBJdGVtOiB7XG4gICAgICAgICAgICBpdGVtSWQ6IHsgUzogaXRlbS5pZCB9LFxuICAgICAgICAgICAgdmVyc2lvbjogeyBOOiBpdGVtLnZlcnNpb24udG9TdHJpbmcoKSB9LFxuICAgICAgICAgICAgdHlwZTogeyBTOiBpdGVtLnR5cGUgfSxcbiAgICAgICAgICAgIHN0YXR1czogeyBTOiBpdGVtLnN0YXR1cyB9LFxuICAgICAgICAgICAgbGFuZzogeyBTOiBpdGVtLmxhbmcgfSxcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogeyBTOiBpdGVtLmNyZWF0ZWRBdCB9LFxuICAgICAgICAgICAgc3BlYzogeyBTOiBKU09OLnN0cmluZ2lmeShpdGVtLnNwZWMpIH1cbiAgICAgICAgfVxuICAgIH0pKTtcblxuICAgIC8qIFJldHVybiByZXN1bHQgdG8gY2FsbGVyICovXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpblwiOiBcIipcIiwgICAvLyBhbGxvdyBhbGwgZG9tYWluc1xuICAgICAgICAgICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzXCI6IFwiKlwiLCAgLy8gYWxsb3cgYW55IGhlYWRlcnNcbiAgICAgICAgICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kc1wiOiBcIk9QVElPTlMsUE9TVCxHRVRcIiAvLyBhbGxvdyB0aGVzZSBtZXRob2RzXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgb2s6IHRydWUsIGl0ZW1JZCB9KVxuICAgIH07XG59O1xuIl19