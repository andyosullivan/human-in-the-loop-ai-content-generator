# Human-in-the-loop AI Content Generator

Welcome! This repo contains a project built for the https://awslambdahackathon.devpost.com/ hackathon.

The project has two main solutions:

### AI Content Generator app - https://d212qaz9q2clt2.cloudfront.net/
- A webpage to allow you to create AI content e.g. for games, using Bedrock (Anthropic Claude, Titan Image Generator), which you can then approve or reject i.e. a human-in-the-loop in case the AI creates sub-quality content.

### Sample Consumer app - https://newgameplease.com/
- A mobile responsive webpage to be a "sample consumer" for the content generator i.e. you can use it to play the games.

## AI Content Generator app
#### Screenshot of the admin page - showing the panel to allow you to request more game items to be generated, and stats on those already generated.
<img width="1410" alt="Screenshot 2025-06-30 at 07 56 05" src="https://github.com/user-attachments/assets/c071a8fe-2004-4a1a-868b-c44035bff4b0" />

#### Screenshot of approving a puzzle game:
<img width="1413" alt="Screenshot 2025-06-30 at 07 56 41" src="https://github.com/user-attachments/assets/18f4c074-bca8-49f7-b233-22651d396830" />

#### Screenshot of approving an Odd One Out game:
<img width="1411" alt="Screenshot 2025-06-30 at 07 57 10" src="https://github.com/user-attachments/assets/5c6bc516-a7ee-4155-a5b2-088de47de0fa" />

#### Screenshot of approving a Word Search game:
<img width="1410" alt="Screenshot 2025-06-30 at 07 56 55" src="https://github.com/user-attachments/assets/ee96a515-4143-4627-8486-a150e9c26077" />

#### Screenshot of the ability to view the JSON code of a game item to be approved or rejected.
<img width="1206" alt="Screenshot 2025-06-26 at 13 05 56" src="https://github.com/user-attachments/assets/106e0e88-2c23-412e-a544-0c968f318ba4" />

#### Architecture:
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

#### Architecture:
- React app hosted on **S3**, fronted by **Cloudfront**
  - This is an unauthenticated app to play games (which use the generated and approved game items).
  - Just hit the "New Game Please" button to get a new game to play!
  - A custom domain name https://newgameplease.com/ registered via **Route 53** and uses a hosted zone for DNS config.
- 2 **Lambdas**
  - LogAnalytics - posts game stats to the analytics dynamodb table.
  - RandomApproved - gets a random game item.

**Both stacks are deployed using CDK.**
