import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const userId = event.queryStringParameters?.userId || authenticatedUserId;
    if (!userId) return error('userId required', 400);

    const authorizer = event.requestContext?.authorizer;
    const userEmail = authorizer?.claims?.email;
    const userPhone = authorizer?.claims?.phone_number;

    const listGroups = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'expenses/', Delimiter: '/' }).promise();
    const prefixes = Array.from(new Set([
      'expenses/non-group/',
      ...(listGroups.CommonPrefixes?.map(p => p.Prefix).filter(Boolean) || [])
    ]));
    let allExpenses: any[] = [];

    for (const prefix of prefixes) {
      const listExpenses = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listExpenses.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];
      
      for (const key of keys) {
        try {
          const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key as string }).promise();
          if (obj.Body) {
            const expense = JSON.parse(obj.Body.toString());
            const isPayer = expense.paidBy === userId || 
                            (userEmail && expense.paidBy === userEmail) || 
                            (userPhone && expense.paidBy === userPhone);
            const isSplitMember = expense.splits?.some((s: any) => 
              s.userId === userId || 
              (userEmail && s.userId === userEmail) || 
              (userPhone && s.userId === userPhone)
            );
            
            if (isPayer || isSplitMember) {
              allExpenses.push(expense);
            }
          }
        } catch (e) {}
      }
    }

    allExpenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return success(allExpenses);
  } catch (err: any) {
    return error(err.message);
  }
};
