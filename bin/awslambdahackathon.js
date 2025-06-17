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
const mainStack = new awslambdahackathon_stack_1.AwslambdahackathonStack(app, 'AwslambdahackathonStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
new game_player_app_stack_1.GamePlayerAppStack(app, 'GamePlayerAppStack', {
    itemsTable: mainStack.itemsTable, // This is now recognized!
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXdzbGFtYmRhaGFja2F0aG9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXdzbGFtYmRhaGFja2F0aG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsaURBQW1DO0FBQ25DLDhFQUEwRTtBQUMxRSx3RUFBa0UsQ0FBRSwrQkFBK0I7QUFFbkcsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxrREFBdUIsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLEVBQUU7SUFDMUUsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUU7Q0FDNUYsQ0FBQyxDQUFDO0FBRUgsSUFBSSwwQ0FBa0IsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLEVBQUU7SUFDOUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLEVBQUUsMEJBQTBCO0lBQzVELEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFO0NBQzVGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBBd3NsYW1iZGFoYWNrYXRob25TdGFjayB9IGZyb20gJy4uL2xpYi9hd3NsYW1iZGFoYWNrYXRob24tc3RhY2snO1xuaW1wb3J0IHsgR2FtZVBsYXllckFwcFN0YWNrIH0gZnJvbSAnLi4vbGliL2dhbWUtcGxheWVyLWFwcC1zdGFjayc7ICAvLyA8LS0gSW1wb3J0IHlvdXIgc2Vjb25kIHN0YWNrXG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5cbmNvbnN0IG1haW5TdGFjayA9IG5ldyBBd3NsYW1iZGFoYWNrYXRob25TdGFjayhhcHAsICdBd3NsYW1iZGFoYWNrYXRob25TdGFjaycsIHtcbiAgICBlbnY6IHsgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCwgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfSxcbn0pO1xuXG5uZXcgR2FtZVBsYXllckFwcFN0YWNrKGFwcCwgJ0dhbWVQbGF5ZXJBcHBTdGFjaycsIHtcbiAgICBpdGVtc1RhYmxlOiBtYWluU3RhY2suaXRlbXNUYWJsZSwgLy8gVGhpcyBpcyBub3cgcmVjb2duaXplZCFcbiAgICBlbnY6IHsgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCwgcmVnaW9uOiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9SRUdJT04gfSxcbn0pO1xuXG4iXX0=