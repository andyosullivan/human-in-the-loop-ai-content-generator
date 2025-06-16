"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda/reviewer.ts
var reviewer_exports = {};
__export(reviewer_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(reviewer_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var TABLE_NAME = process.env.ITEMS_TABLE_NAME;
var REGION = process.env.AWS_REGION || "eu-west-1";
var ddb = new import_client_dynamodb.DynamoDBClient({ region: REGION });
var handler = async (event = {}) => {
  let body;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }
  const { itemId, version, status, reviewer, comment } = body || {};
  if (!itemId || !version || !status) {
    return { statusCode: 400, body: JSON.stringify({ error: "itemId, version, and status required" }) };
  }
  if (!["APPROVED", "REJECTED"].includes(status)) {
    return { statusCode: 400, body: JSON.stringify({ error: "Status must be APPROVED or REJECTED" }) };
  }
  try {
    await ddb.send(new import_client_dynamodb.UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        itemId: { S: itemId },
        version: { N: version.toString() }
      },
      UpdateExpression: "SET #status = :s, reviewer = :r, reviewComment = :c, reviewedAt = :t",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":s": { S: status },
        ":r": { S: reviewer || "unknown" },
        ":c": { S: comment || "" },
        ":t": { S: (/* @__PURE__ */ new Date()).toISOString() }
      }
    }));
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        // allow all domains
        "Access-Control-Allow-Headers": "*",
        // allow any headers
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        // allow these methods
      },
      body: JSON.stringify({ ok: true, itemId, status })
    };
  } catch (err) {
    console.error("Error updating item:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        // allow all domains
        "Access-Control-Allow-Headers": "*",
        // allow any headers
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
        // allow these methods
      },
      body: JSON.stringify({
        error: "DynamoDB update failed",
        detail: err instanceof Error ? err.message : JSON.stringify(err)
      })
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
