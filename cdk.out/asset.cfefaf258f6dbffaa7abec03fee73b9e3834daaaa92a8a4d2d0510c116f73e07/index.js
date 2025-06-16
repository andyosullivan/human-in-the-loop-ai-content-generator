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

// lambda/listPending.ts
var listPending_exports = {};
__export(listPending_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(listPending_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var TABLE_NAME = process.env.ITEMS_TABLE_NAME;
var REGION = process.env.AWS_REGION || "eu-west-1";
var ddb = new import_client_dynamodb.DynamoDBClient({ region: REGION });
var handler = async () => {
  const { Items } = await ddb.send(new import_client_dynamodb.QueryCommand({
    TableName: TABLE_NAME,
    IndexName: "StatusIndex",
    // Add this GSI if not present!
    KeyConditionExpression: "#s = :pending",
    ExpressionAttributeNames: { "#s": "status" },
    ExpressionAttributeValues: { ":pending": { S: "PENDING" } }
  }));
  const items = (Items || []).map((item) => ({
    itemId: item.itemId.S,
    version: Number(item.version.N),
    type: item.type.S,
    status: item.status.S,
    lang: item.lang.S,
    createdAt: item.createdAt.S,
    spec: item.spec && item.spec.S ? JSON.parse(item.spec.S) : {}
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
    body: JSON.stringify({ items })
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
