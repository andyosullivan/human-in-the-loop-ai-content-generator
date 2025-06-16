"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// lambda/generator.ts
const client_bedrock_runtime_1 = require("@aws-sdk/client-bedrock-runtime");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const uuid_1 = require("uuid");
// ----- config from env -----
const TABLE_NAME = process.env.ITEMS_TABLE_NAME;
const MODEL_ID = process.env.BEDROCK_MODEL_ID; // e.g. "anthropic.claude-3-sonnet-20240229-v1:0"
const REGION = process.env.AWS_REGION || "eu-west-1";
// ----- one-time clients -----
const bedrock = new client_bedrock_runtime_1.BedrockRuntimeClient({ region: REGION });
const ddb = new client_dynamodb_1.DynamoDBClient({ region: REGION });
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
    const response = await bedrock.send(new client_bedrock_runtime_1.InvokeModelCommand(body));
    const raw = new TextDecoder().decode(response.body);
    // Strip out any preamble if present (Claude sometimes returns extra text)
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
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
    console.log("RAW Bedrock output:", raw);
    console.log("PARSED Bedrock item:", item);
    /* Post-process: add id, timestamps, status */
    const itemId = `item_${(0, uuid_1.v4)().replace(/-/g, "").slice(0, 8)}`;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHNCQUFzQjtBQUN0Qiw0RUFBMkY7QUFDM0YsOERBQTBFO0FBQzFFLCtCQUFvQztBQUVwQyw4QkFBOEI7QUFDOUIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBaUIsQ0FBQztBQUNqRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFpQixDQUFDLENBQUMsaURBQWlEO0FBQ2pHLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUVyRCwrQkFBK0I7QUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSw2Q0FBb0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzdELE1BQU0sR0FBRyxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBRW5ELG9FQUFvRTtBQUNwRSxNQUFNLHVCQUF1QixHQUFHLFVBQVUsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O0NBZTFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFVCx3RUFBd0U7QUFDeEUsU0FBUyxNQUFNLEtBQUssT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUV0RCx3RUFBd0U7QUFDakUsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLFFBQWEsRUFBRSxFQUFnQixFQUFFO0lBQzNELGlFQUFpRTtJQUNqRSxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLGFBQWEsQ0FBQztJQUNsRCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztJQUV6QyxZQUFZO0lBQ1osTUFBTSxNQUFNLEdBQUc7Ozs7RUFJakIsdUJBQXVC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LENBQUM7SUFHRCxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQ0FBYyxDQUFDO1FBQzlCLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLElBQUksRUFBRTtZQUNGLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ3RCLE9BQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQ3ZDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3RCLE1BQU0sRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQzFCLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFO1lBQ3RCLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ2hDLElBQUksRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRTtTQUN6QztLQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUosNkJBQTZCO0lBQzdCLE9BQU87UUFDSCxVQUFVLEVBQUUsR0FBRztRQUNmLE9BQU8sRUFBRTtZQUNMLDZCQUE2QixFQUFFLEdBQUcsRUFBSSxvQkFBb0I7WUFDMUQsOEJBQThCLEVBQUUsR0FBRyxFQUFHLG9CQUFvQjtZQUMxRCw4QkFBOEIsRUFBRSxrQkFBa0IsQ0FBQyxzQkFBc0I7U0FDNUU7UUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7S0FDN0MsQ0FBQztBQUNOLENBQUMsQ0FBQztBQXpJVyxRQUFBLE9BQU8sV0F5SWxCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gbGFtYmRhL2dlbmVyYXRvci50c1xuaW1wb3J0IHsgQmVkcm9ja1J1bnRpbWVDbGllbnQsIEludm9rZU1vZGVsQ29tbWFuZCB9IGZyb20gXCJAYXdzLXNkay9jbGllbnQtYmVkcm9jay1ydW50aW1lXCI7XG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tIFwiQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiXCI7XG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tIFwidXVpZFwiO1xuXG4vLyAtLS0tLSBjb25maWcgZnJvbSBlbnYgLS0tLS1cbmNvbnN0IFRBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5JVEVNU19UQUJMRV9OQU1FITtcbmNvbnN0IE1PREVMX0lEID0gcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCE7IC8vIGUuZy4gXCJhbnRocm9waWMuY2xhdWRlLTMtc29ubmV0LTIwMjQwMjI5LXYxOjBcIlxuY29uc3QgUkVHSU9OID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCBcImV1LXdlc3QtMVwiO1xuXG4vLyAtLS0tLSBvbmUtdGltZSBjbGllbnRzIC0tLS0tXG5jb25zdCBiZWRyb2NrID0gbmV3IEJlZHJvY2tSdW50aW1lQ2xpZW50KHsgcmVnaW9uOiBSRUdJT04gfSk7XG5jb25zdCBkZGIgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IFJFR0lPTiB9KTtcblxuLy8gLS0tLS0gc2NoZW1hICh0cmltbWVkIOKAkyBrZWVwIGtleXMgaW4gc3luYyB3aXRoIHlvdXIgbGF0ZXN0KSAtLS0tLVxuY29uc3QgSU5URVJBQ1RJVkVfSVRFTV9TQ0hFTUEgPSAvKiBqc29uICovIGBcbllvdSBtdXN0IHJldHVybiBKU09OIHRoYXQgdmFsaWRhdGVzIGFnYWluc3QgdGhpcyBzY2hlbWE6XG57XG4gIFwiJHNjaGVtYVwiOlwiaHR0cHM6Ly9qc29uLXNjaGVtYS5vcmcvZHJhZnQvMjAyMC0xMi9zY2hlbWFcIixcbiAgXCJ0eXBlXCI6XCJvYmplY3RcIixcbiAgXCJyZXF1aXJlZFwiOltcImlkXCIsXCJ2ZXJzaW9uXCIsXCJ0eXBlXCIsXCJsYW5nXCIsXCJzdGF0dXNcIixcInNwZWNcIl0sXG4gIFwicHJvcGVydGllc1wiOntcbiAgICBcImlkXCI6e1widHlwZVwiOlwic3RyaW5nXCIsXCJwYXR0ZXJuXCI6XCJeaXRlbV9bYS1mMC05XXs4fSRcIn0sXG4gICAgXCJ2ZXJzaW9uXCI6e1widHlwZVwiOlwiaW50ZWdlclwifSxcbiAgICBcInR5cGVcIjp7XCJlbnVtXCI6W1wid29yZF9zZWFyY2hcIixcInF1aXpfbWNxXCIsXCJtZW1vcnlfbWF0Y2hcIixcInNwYWNlX3Nob290ZXJcIixcImppZ3Nhd1wiXX0sXG4gICAgXCJsYW5nXCI6e1widHlwZVwiOlwic3RyaW5nXCJ9LFxuICAgIFwic3RhdHVzXCI6e1wiZW51bVwiOltcIlBFTkRJTkdcIixcIkFQUFJPVkVEXCIsXCJSRUpFQ1RFRFwiXX0sXG4gICAgXCJzcGVjXCI6e1widHlwZVwiOlwib2JqZWN0XCJ9XG4gIH1cbn1cbmAudHJpbSgpO1xuXG4vLyAtLSBiYXNpYyB1dGlsaXR5IC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmZ1bmN0aW9uIG5vd0lzbygpIHsgcmV0dXJuIG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTsgfVxuXG4vLyAtLSBMYW1iZGEgZW50cnkgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBhbnkgPSB7fSk6IFByb21pc2U8YW55PiA9PiB7XG4gICAgLyogQ2hvb3NlIHRoZSBpdGVtIHR5cGUgJiBsYW5ndWFnZSBmcm9tIHRoZSByZXF1ZXN0IG9yIGRlZmF1bHQgKi9cbiAgICBjb25zdCByZXF1ZXN0ZWRUeXBlID0gZXZlbnQudHlwZSB8fCBcIndvcmRfc2VhcmNoXCI7XG4gICAgY29uc3QgcmVxdWVzdGVkTGFuZyA9IGV2ZW50LmxhbmcgfHwgXCJlblwiO1xuXG4gICAgLyogcHJvbXB0ICovXG4gICAgY29uc3QgcHJvbXB0ID0gYFxuWW91IGFyZSBhbiBleHBlcnQgcHV6emxlIGFuZCBnYW1lIEpTT04gZ2VuZXJhdG9yLlxuXG4qKlJldHVybiBPTkxZIGEgc2luZ2xlIEpTT04gb2JqZWN0IHRoYXQgdmFsaWRhdGVzIGFnYWluc3QgdGhpcyBzY2hlbWE6KipcbiR7SU5URVJBQ1RJVkVfSVRFTV9TQ0hFTUF9XG5cbioqVHlwZToqKiBcIiR7cmVxdWVzdGVkVHlwZX1cIlxuKipMYW5ndWFnZToqKiBcIiR7cmVxdWVzdGVkTGFuZ31cIlxuKipUaGVtZToqKiBcImhhY2thdGhvbi1kZW1vXCJcbioqRGlmZmljdWx0eToqKiBcImVhc3lcIlxuXG5Gb3IgZWFjaCAndHlwZScsIHRoZSBcInNwZWNcIiBvYmplY3Qgc2hvdWxkIGZvbGxvdyB0aGVzZSBwYXR0ZXJuczpcblxuLSAqKndvcmRfc2VhcmNoOioqXG4gIC0gXCJncmlkXCI6IGEgMkQgYXJyYXkgb2YgbGV0dGVycyAoOeKAkzEyIHJvd3Mgb2YgOeKAkzEyIHVwcGVyY2FzZSBsZXR0ZXJzIGVhY2gpXG4gIC0gXCJ3b3Jkc1wiOiBhIGxpc3Qgb2YgYXQgbGVhc3QgNiBoaWRkZW4gd29yZHMgcmVsYXRlZCB0byB0aGUgdGhlbWVcblxuLSAqKnF1aXpfbWNxOioqXG4gIC0gXCJxdWVzdGlvbnNcIjogYW4gYXJyYXkgb2YgYXQgbGVhc3QgNSBvYmplY3RzLiBFYWNoIG9iamVjdCBtdXN0IGhhdmU6XG4gICAgLSBcInF1ZXN0aW9uXCI6IHN0cmluZ1xuICAgIC0gXCJjaG9pY2VzXCI6IGFycmF5IG9mIDQgc3RyaW5nc1xuICAgIC0gXCJhbnN3ZXJcIjogaW50ZWdlciAodGhlIGluZGV4IG9mIHRoZSBjb3JyZWN0IGFuc3dlciBpbiBcImNob2ljZXNcIilcblxuLSAqKm1lbW9yeV9tYXRjaDoqKlxuICAtIFwicGFpcnNcIjogYW4gYXJyYXkgb2YgYXQgbGVhc3QgNiBvYmplY3RzLCBlYWNoIHdpdGg6XG4gICAgLSBcInRlcm1cIjogc3RyaW5nIChlLmcuIGEgd29yZCBvciBpbWFnZSlcbiAgICAtIFwibWF0Y2hcIjogc3RyaW5nICh0aGUgY29ycmVjdCBwYWlyIGZvciBcInRlcm1cIilcblxuLSAqKnNwYWNlX3Nob290ZXI6KipcbiAgLSBcImxldmVsXCI6IGludGVnZXIgKGRpZmZpY3VsdHkgbGV2ZWwsIDHigJM1KVxuICAtIFwiZW5lbXlUeXBlc1wiOiBhcnJheSBvZiBhdCBsZWFzdCAzIGVuZW15IG5hbWVzIGFzIHN0cmluZ3NcbiAgLSBcInBsYXllckFiaWxpdGllc1wiOiBhcnJheSBvZiBhdCBsZWFzdCAyIGFiaWxpdGllcyBhcyBzdHJpbmdzXG5cbi0gKipqaWdzYXc6KipcbiAgLSBcImltYWdlVXJsXCI6IGEgcGxhdXNpYmxlIGltYWdlIFVSTCBzdHJpbmcgKHVzZSBhIHBsYWNlaG9sZGVyIGxpa2UgXCJodHRwczovL2V4YW1wbGUuY29tL2ppZ3NhdzEucG5nXCIpXG4gIC0gXCJwaWVjZXNcIjogaW50ZWdlciAobnVtYmVyIG9mIHBpZWNlcywgMTLigJM0OClcblxuKipTdHJpY3QgaW5zdHJ1Y3Rpb25zOioqXG4tIFJldHVybiBPTkxZIHRoZSBKU09OLCBubyBtYXJrZG93biwgbm8gZXhwbGFuYXRpb25zLCBubyBcXGBcXGBcXGAgZmVuY2VzLCBubyB0cmFpbGluZyB0ZXh0LlxuLSBGaWxsIGluIEFMTCByZXF1aXJlZCBmaWVsZHMgaW4gdGhlIFwic3BlY1wiIG9iamVjdCBmb3IgdGhlIGdpdmVuIHR5cGXigJRuZXZlciBsZWF2ZSBhcnJheXMgZW1wdHkgb3Igb21pdCBmaWVsZHMuXG4tIFVzZSBwbGF1c2libGUgYW5kIGNyZWF0aXZlIGNvbnRlbnQuIElmIGEgZmllbGQgaXMgbm90IGtub3duLCBjcmVhdGUgYSByZWFsaXN0aWMgcGxhY2Vob2xkZXIgdmFsdWUuXG4tIFRoZSBKU09OICoqbXVzdCoqIGJlIHZhbGlkIGFuZCBtYXRjaCB0aGUgcmVxdWlyZWQgc2NoZW1hIGFuZCBwYXR0ZXJucyBhYm92ZS5cblxuSWYgdGhlIHR5cGUgaXMgbm90IHJlY29nbml6ZWQsIHJldHVybiBhbiBvYmplY3Qgd2l0aCBcInN0YXR1c1wiOiBcIlJFSkVDVEVEXCIgYW5kIGEgbWVzc2FnZSBpbiBcInNwZWNcIi5cbmA7XG5cblxuICAgIC8qIEJlZHJvY2sgQW50aHJvcGljIENsYXVkZSAzLjUvMyBTb25uZXQgbWVzc2FnZSBmb3JtYXQgKi9cbiAgICBjb25zdCBhbnRocm9waWNQYXlsb2FkID0ge1xuICAgICAgICBhbnRocm9waWNfdmVyc2lvbjogXCJiZWRyb2NrLTIwMjMtMDUtMzFcIixcbiAgICAgICAgbWF4X3Rva2VuczogMTAyNCxcbiAgICAgICAgbWVzc2FnZXM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICByb2xlOiBcInVzZXJcIixcbiAgICAgICAgICAgICAgICBjb250ZW50OiBwcm9tcHRcbiAgICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgIH07XG5cbiAgICBjb25zdCBib2R5ID0ge1xuICAgICAgICBtb2RlbElkOiBNT0RFTF9JRCxcbiAgICAgICAgY29udGVudFR5cGU6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBhY2NlcHQ6IFwiYXBwbGljYXRpb24vanNvblwiLFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShhbnRocm9waWNQYXlsb2FkKVxuICAgIH07XG5cbiAgICAvKiBDYWxsIEJlZHJvY2sgKi9cbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGJlZHJvY2suc2VuZChuZXcgSW52b2tlTW9kZWxDb21tYW5kKGJvZHkpKTtcbiAgICBjb25zdCByYXcgPSBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUocmVzcG9uc2UuYm9keSk7XG5cblxuXG4gICAgLy8gU3RyaXAgb3V0IGFueSBwcmVhbWJsZSBpZiBwcmVzZW50IChDbGF1ZGUgc29tZXRpbWVzIHJldHVybnMgZXh0cmEgdGV4dClcbiAgICBjb25zdCBqc29uU3RhcnQgPSByYXcuaW5kZXhPZigneycpO1xuICAgIGNvbnN0IGpzb25FbmQgPSByYXcubGFzdEluZGV4T2YoJ30nKTtcbiAgICBsZXQgaXRlbTtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBvdXRlciA9IEpTT04ucGFyc2UocmF3KTtcbiAgICAgICAgY29uc3QganNvblN0ciA9IG91dGVyPy5jb250ZW50Py5bMF0/LnRleHQ7XG4gICAgICAgIGl0ZW0gPSBKU09OLnBhcnNlKGpzb25TdHIpO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiQ291bGQgbm90IGV4dHJhY3QgcHV6emxlIEpTT04gZnJvbSBDbGF1ZGUgcmVzcG9uc2U6XCIsIHJhdyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkNsYXVkZSBvdXRwdXQgbm90IHZhbGlkIEpTT05cIiwgcmF3IH0pXG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coXCJSQVcgQmVkcm9jayBvdXRwdXQ6XCIsIHJhdyk7XG4gICAgY29uc29sZS5sb2coXCJQQVJTRUQgQmVkcm9jayBpdGVtOlwiLCBpdGVtKTtcblxuICAgIC8qIFBvc3QtcHJvY2VzczogYWRkIGlkLCB0aW1lc3RhbXBzLCBzdGF0dXMgKi9cbiAgICBjb25zdCBpdGVtSWQgPSBgaXRlbV8ke3V1aWR2NCgpLnJlcGxhY2UoLy0vZywgXCJcIikuc2xpY2UoMCwgOCl9YDtcbiAgICBpdGVtLmlkID0gaXRlbUlkO1xuICAgIGl0ZW0udmVyc2lvbiA9IDE7XG4gICAgaXRlbS5zdGF0dXMgPSBcIlBFTkRJTkdcIjtcbiAgICBpdGVtLmNyZWF0ZWRBdCA9IG5vd0lzbygpO1xuXG4gICAgLyogU3RvcmUgaW4gRHluYW1vREIgKi9cbiAgICBpZiAoIWl0ZW0gfHwgIWl0ZW0udHlwZSB8fCAhaXRlbS5sYW5nIHx8ICFpdGVtLnNwZWMpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIkluY29tcGxldGUgaXRlbSBmcm9tIEJlZHJvY2s6XCIsIGl0ZW0pO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJDbGF1ZGUgb3V0cHV0IGluY29tcGxldGVcIiwgZGV0YWlsOiBpdGVtIH0pXG4gICAgICAgIH07XG4gICAgfVxuXG5cbiAgICBhd2FpdCBkZGIuc2VuZChuZXcgUHV0SXRlbUNvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IFRBQkxFX05BTUUsXG4gICAgICAgIEl0ZW06IHtcbiAgICAgICAgICAgIGl0ZW1JZDogeyBTOiBpdGVtLmlkIH0sXG4gICAgICAgICAgICB2ZXJzaW9uOiB7IE46IGl0ZW0udmVyc2lvbi50b1N0cmluZygpIH0sXG4gICAgICAgICAgICB0eXBlOiB7IFM6IGl0ZW0udHlwZSB9LFxuICAgICAgICAgICAgc3RhdHVzOiB7IFM6IGl0ZW0uc3RhdHVzIH0sXG4gICAgICAgICAgICBsYW5nOiB7IFM6IGl0ZW0ubGFuZyB9LFxuICAgICAgICAgICAgY3JlYXRlZEF0OiB7IFM6IGl0ZW0uY3JlYXRlZEF0IH0sXG4gICAgICAgICAgICBzcGVjOiB7IFM6IEpTT04uc3RyaW5naWZ5KGl0ZW0uc3BlYykgfVxuICAgICAgICB9XG4gICAgfSkpO1xuXG4gICAgLyogUmV0dXJuIHJlc3VsdCB0byBjYWxsZXIgKi9cbiAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgIFwiQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luXCI6IFwiKlwiLCAgIC8vIGFsbG93IGFsbCBkb21haW5zXG4gICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnNcIjogXCIqXCIsICAvLyBhbGxvdyBhbnkgaGVhZGVyc1xuICAgICAgICAgICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzXCI6IFwiT1BUSU9OUyxQT1NULEdFVFwiIC8vIGFsbG93IHRoZXNlIG1ldGhvZHNcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBvazogdHJ1ZSwgaXRlbUlkIH0pXG4gICAgfTtcbn07XG4iXX0=