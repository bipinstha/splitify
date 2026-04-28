import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { simplifyDebts } from '../utils/simplifier';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, body: JSON.stringify({ message: 'userId required' }) };

    const listGroups = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'expenses/', Delimiter: '/' }).promise();
    const prefixes = listGroups.CommonPrefixes?.map(p => p.Prefix) || ['expenses/non-group/'];

    let youAreOwed = 0;
    let youOwe = 0;
    const userBalances: { [key: string]: number } = {};

    for (const prefix of prefixes) {
      const listExpenses = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listExpenses.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

      const expenseObjects = await Promise.all(keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key! }).promise()));

      for (const obj of expenseObjects) {
        if (!obj.Body) continue;
        const expense = JSON.parse(obj.Body.toString());
        const mySplit = expense.splits?.find((s: any) => s.userId === userId);
        
        if (expense.paidBy === userId) {
            expense.splits.forEach((split: any) => {
                if (split.userId !== userId) {
                    userBalances[split.userId] = (userBalances[split.userId] || 0) + split.owed;
                    youAreOwed += split.owed;
                }
            });
        } else if (mySplit) {
            const payerId = expense.paidBy;
            userBalances[payerId] = (userBalances[payerId] || 0) - mySplit.owed;
            youOwe += mySplit.owed;
        }
      }
    }

    const friendBalances = Object.keys(userBalances).map(id => ({ friendId: id, balance: userBalances[id] })).filter(fb => fb.balance !== 0);

    // Simplification Logic
    const allUserBalances = { ...userBalances };
    allUserBalances[userId] = youAreOwed - youOwe;
    const simplifiedTransactions = simplifyDebts(allUserBalances);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
      body: JSON.stringify({
        totalBalance: youAreOwed - youOwe,
        youOwe,
        youAreOwed,
        friendBalances,
        simplifiedTransactions,
        userId
      }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
