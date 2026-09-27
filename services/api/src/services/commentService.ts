import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { v4 as uuidv4 } from 'uuid';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const add = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = getUserId(event);
    if (!event.body) return error('Missing body', 400);
    const { expenseId, text } = JSON.parse(event.body);
    if (!expenseId || !text?.trim()) return error('expenseId and text are required', 400);

    const commentId = `comment_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const comment = {
      id: commentId,
      expenseId,
      userId,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `comments/${expenseId}/${commentId}.json`,
      Body: JSON.stringify(comment),
      ContentType: 'application/json',
    }).promise();

    return success(comment, 201);
  } catch (err: any) {
    return error(err.message);
  }
};

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const expenseId = event.queryStringParameters?.expenseId;
    if (!expenseId) return error('expenseId required', 400);

    const result = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: `comments/${expenseId}/` }).promise();
    const keys = result.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

    const comments = await Promise.all(keys.map(async key => {
      const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key as string }).promise();
      return JSON.parse(obj.Body!.toString());
    }));

    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return success(comments);
  } catch (err: any) {
    return error(err.message);
  }
};
