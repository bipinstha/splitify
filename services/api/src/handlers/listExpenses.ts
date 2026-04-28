import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ message: 'userId is required' }) };
    }

    // List groups/prefixes
    const listGroups = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: 'expenses/',
      Delimiter: '/'
    }).promise();

    const prefixes = listGroups.CommonPrefixes?.map(p => p.Prefix) || ['expenses/non-group/'];
    let allExpenses: any[] = [];

    for (const prefix of prefixes) {
      const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listObjects.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

      const results = await Promise.all(
        keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key! }).promise())
      );

      results.forEach(obj => {
        if (obj.Body) {
          const expense = JSON.parse(obj.Body.toString());
          // Only include if user is part of the expense
          const isParticipant = expense.paidBy === userId || expense.splits?.some((s: any) => s.userId === userId);
          if (isParticipant) {
            allExpenses.push(expense);
          }
        }
      });
    }

    // Sort by date descending
    allExpenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
      body: JSON.stringify(allExpenses),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
