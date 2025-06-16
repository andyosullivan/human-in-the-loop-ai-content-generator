"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda/generator.ts
var generator_exports = {};
__export(generator_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(generator_exports);
var import_client_bedrock_runtime = require("@aws-sdk/client-bedrock-runtime");
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");

// node_modules/uuid/dist/esm-node/rng.js
var import_crypto = __toESM(require("crypto"));
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

// node_modules/uuid/dist/esm-node/native.js
var import_crypto2 = __toESM(require("crypto"));
var native_default = {
  randomUUID: import_crypto2.default.randomUUID
};

// node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  if (native_default.randomUUID && !buf && !options) {
    return native_default.randomUUID();
  }
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return unsafeStringify(rnds);
}
var v4_default = v4;

// lambda/generator.ts
var TABLE_NAME = process.env.ITEMS_TABLE_NAME;
var MODEL_ID = process.env.BEDROCK_MODEL_ID;
var REGION = process.env.AWS_REGION || "eu-west-1";
var bedrock = new import_client_bedrock_runtime.BedrockRuntimeClient({ region: REGION });
var ddb = new import_client_dynamodb.DynamoDBClient({ region: REGION });
var INTERACTIVE_ITEM_SCHEMA = (
  /* json */
  `
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
`.trim()
);
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
var handler = async (event = {}) => {
  const requestedType = event.type || "word_search";
  const requestedLang = event.lang || "en";
  const prompt = `
You are an expert puzzle generator. Return ONLY JSON that validates against this schema:

${INTERACTIVE_ITEM_SCHEMA}

Prompt: Produce a new interactive item.
  type   = "${requestedType}",
  lang   = "${requestedLang}",
  theme  = "hackathon-demo",
  difficulty = "easy".

Return only JSON, without \`\`\` fences.
Return only JSON. Do not include explanations, markdown, or any text outside the JSON object.
If you do not know a field, fill it with a plausible placeholder.
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
  const response = await bedrock.send(new import_client_bedrock_runtime.InvokeModelCommand(body));
  const raw = new TextDecoder().decode(response.body);
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  let item;
  try {
    item = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
  } catch (err) {
    console.error("Bedrock response not valid JSON:", raw);
    throw err;
  }
  console.log("RAW Bedrock output:", raw);
  console.log("PARSED Bedrock item:", item);
  const itemId = `item_${v4_default().replace(/-/g, "").slice(0, 8)}`;
  item.id = itemId;
  item.version = 1;
  item.status = "PENDING";
  item.createdAt = nowIso();
  if (!item || !item.type || !item.lang || !item.spec) {
    console.error("Incomplete item from Bedrock:", item);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Claude output incomplete", detail: item })
    };
  }
  await ddb.send(new import_client_dynamodb.PutItemCommand({
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
    body: JSON.stringify({ ok: true, itemId })
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
