#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AwslambdahackathonStack } from '../lib/awslambdahackathon-stack';
import { GamePlayerAppStack } from '../lib/game-player-app-stack';  // <-- Import your second stack

const app = new cdk.App();

new AwslambdahackathonStack(app, 'AwslambdahackathonStack', {
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new GamePlayerAppStack(app, 'GamePlayerAppStack', {
    // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
