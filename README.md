# Human-in-the-loop AI Content Generator

Welcome! This repo contains a project built for the https://awslambdahackathon.devpost.com/ hackathon.

The project has two main solutions:

### AI Content Generator app - https://d212qaz9q2clt2.cloudfront.net/
- A webpage to allow you to create AI content e.g. for games, using Bedrock (Anthropic Claude, Titan Image Generator), which you can then approve or reject i.e. a human-in-the-loop in case the AI creates sub-quality content.

### Sample Consumer app - https://newgameplease.com/
- A mobile responsive webpage to be a "sample consumer" for the content generator i.e. you can use it to play the games.

## AI Content Generator app
#### Screenshot of admin page with Game Item Stats:
<img width="1208" alt="Screenshot 2025-06-26 at 13 02 57" src="https://github.com/user-attachments/assets/4ed34f76-f946-4def-b2e1-28e83cd2725d" />

#### Screenshot of approving a puzzle game:
<img width="1206" alt="Screenshot 2025-06-26 at 13 03 57" src="https://github.com/user-attachments/assets/4ce68790-139d-4547-8fe9-59978af36b9f" />

#### Screenshot of approving an Odd One Out game:
<img width="1206" alt="Screenshot 2025-06-26 at 13 04 08" src="https://github.com/user-attachments/assets/edaba03b-be5b-4acb-a798-4184aeb7ab77" />

#### Screenshot of the ability to view the JSON code of a game item to be approved or rejected.
<img width="1206" alt="Screenshot 2025-06-26 at 13 05 56" src="https://github.com/user-attachments/assets/106e0e88-2c23-412e-a544-0c968f318ba4" />

- React app, hosted on **S3**, fronted by **Cloudfront**
    - User authentication using **Cognito**
    - Reviewer screen - where admin users can generate new game items, approve or reject them, and view game item stats.
    - Analytics sceeen - where admin users can view stats from the game app (which consumes the generated game items).
    - Prompt-Config screen - where admin users can view and edit the prompt used to generate game items.
- **API Gateway**
- 8 **Lambdas**
    - Generator: generates content for games using **Bedrock** (Antropic's Claude for text, Titan for images)
    - SetPromptConfig: to save / update the prompt used with Bedrock - so the admin user can edit it on-screen.
    - GetPromptConfig: to get the prompt used with Bedrock
    - ListPending: to get the list of game items (generated via Bedrock) to be approved or rejected.
    - ItemStats: to get stats on all game items
    - Reviewer: to approve or reject a game item.
    - ListAnalytics: to get analytics from the game app i.e. page loads etc.
- Lambda authentication - all Lambdas are secured using JWTs
- **Stepfunctions** are used to run the Generator lambda (so admin users can create multiple new game items)
- 3 **DynamoDB** tables
    - ItemsTable - to store game items
    - AnalyticsTable - to store analytics from the game app
    - PromptConfig - to store the prompt used to generate the game items
- A **S3 Bucket** to store generated images (used in one of the game types) - this is fronted by **Cloudfront**, secured via **OAI**.
- SSL cert for Cloudfront generated using **ACM**

## Sample Consumer app

- React app hosted on **S3**, fronted by **Cloudfront**
  - This is an unauthenticated app to play games (which use the generated and approved game items).
  - Just hit the "New Game Please" button to get a new game to play!
  - A custom domain name https://newgameplease.com/ registered via **Route 53** and uses a hosted zone for DNS config.
- 2 **Lambdas**
  - LogAnalytics - posts game stats to the analytics dynamodb table.
  - RandomApproved - gets a random game item.

**Both stacks are deployed using CDK.**
