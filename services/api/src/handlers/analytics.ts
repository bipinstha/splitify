import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { success, error } from '../utils/response';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const getGroupAnalytics = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const groupId = event.queryStringParameters?.groupId;
    if (!groupId) return error('groupId is required', 400);

    const listObjects = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `expenses/${groupId}/`,
    }).promise();

    const keys = listObjects.Contents?.map(obj => obj.Key).filter(Boolean) as string[] || [];
    
    if (keys.length === 0) {
      return success({
        totalSpending: 0,
        categoryBreakdown: {},
        userBreakdown: {},
        monthlySpending: {},
      });
    }

    const expensePromises = keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise());
    const expenseObjects = await Promise.all(expensePromises);
    const expenses = expenseObjects.map(obj => JSON.parse(obj.Body!.toString()));

    let totalSpending = 0;
    const categoryBreakdown: { [key: string]: number } = {};
    const userBreakdown: { [key: string]: number } = {};
    const monthlySpending: { [key: string]: number } = {};

    expenses.forEach(expense => {
      const amount = expense.amount || 0;
      totalSpending += amount;
      const category = expense.category || 'General';
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
      const user = expense.paidBy || 'Unknown';
      userBreakdown[user] = (userBreakdown[user] || 0) + amount;
      const date = new Date(expense.createdAt || expense.date || Date.now());
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlySpending[monthYear] = (monthlySpending[monthYear] || 0) + amount;
    });

    return success({
      totalSpending,
      categoryBreakdown,
      userBreakdown,
      monthlySpending,
      expenseCount: expenses.length,
    });
  } catch (err: any) {
    return error(err.message);
  }
};
