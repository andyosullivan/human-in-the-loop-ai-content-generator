#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = __importStar(require("aws-cdk-lib"));
const awslambdahackathon_stack_1 = require("../lib/awslambdahackathon-stack");
const game_player_app_stack_1 = require("../lib/game-player-app-stack"); // <-- Import your second stack
const app = new cdk.App();
new awslambdahackathon_stack_1.AwslambdahackathonStack(app, 'AwslambdahackathonStack', {
// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
new game_player_app_stack_1.GamePlayerAppStack(app, 'GamePlayerAppStack', {
// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsaURBQW1DO0FBQ25DLDhFQUEwRTtBQUMxRSx3RUFBa0UsQ0FBRSwrQkFBK0I7QUFFbkcsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsSUFBSSxrREFBdUIsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLEVBQUU7QUFDeEQsNkZBQTZGO0NBQ2hHLENBQUMsQ0FBQztBQUVILElBQUksMENBQWtCLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFO0FBQzlDLDZGQUE2RjtDQUNoRyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQXdzbGFtYmRhaGFja2F0aG9uU3RhY2sgfSBmcm9tICcuLi9saWIvYXdzbGFtYmRhaGFja2F0aG9uLXN0YWNrJztcbmltcG9ydCB7IEdhbWVQbGF5ZXJBcHBTdGFjayB9IGZyb20gJy4uL2xpYi9nYW1lLXBsYXllci1hcHAtc3RhY2snOyAgLy8gPC0tIEltcG9ydCB5b3VyIHNlY29uZCBzdGFja1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG5uZXcgQXdzbGFtYmRhaGFja2F0aG9uU3RhY2soYXBwLCAnQXdzbGFtYmRhaGFja2F0aG9uU3RhY2snLCB7XG4gICAgLy8gZW52OiB7IGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIH0sXG59KTtcblxubmV3IEdhbWVQbGF5ZXJBcHBTdGFjayhhcHAsICdHYW1lUGxheWVyQXBwU3RhY2snLCB7XG4gICAgLy8gZW52OiB7IGFjY291bnQ6IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQsIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIH0sXG59KTtcbiJdfQ==