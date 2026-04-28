# Splitify

A Splitwise clone for Web, Android, and iOS.

## 🚀 Technical Stack (Proposed)
- **Frontend:** [Expo](https://expo.dev/) (React Native) for a single codebase targeting Web, iOS, and Android.
- **Backend:** AWS Lambda (Node.js) via AWS SAM or Serverless Framework.
- **Authentication:** AWS Cognito (Manual + Google/Apple/Facebook Social Login).
- **Data Storage:** AWS S3 (Storing structured JSON for balances/groups and binary files for receipts).
- **API:** Amazon API Gateway.

## 📁 Project Structure
- `/apps/mobile-web`: Expo project for the UI.
- `/services/api`: AWS Lambda functions and infrastructure (SAM/CDK).
- `/docs`: Documentation and architecture diagrams.

## 📝 Next Steps
1. Initialize the Expo project for cross-platform UI.
2. Set up the AWS SAM/CDK project for the Lambda-based API.
3. Design the S3 data schema (JSON structure) to act as our primary database.
