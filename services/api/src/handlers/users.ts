import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { success, error } from '../utils/response';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const saveToken = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { userId, pushToken } = JSON.parse(event.body || '{}');
    
    if (!userId || !pushToken) {
      return error('userId and pushToken required', 400);
    }

    const key = `users/${userId}/profile.json`;
    let profile: any = { userId, pushTokens: [] };

    try {
      const existing = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
      if (existing.Body) {
        profile = JSON.parse(existing.Body.toString());
      }
    } catch (e) {
      // Profile doesn't exist yet, that's fine
    }

    if (!profile.pushTokens) profile.pushTokens = [];
    if (!profile.pushTokens.includes(pushToken)) {
      profile.pushTokens.push(pushToken);
    }

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: JSON.stringify(profile),
      ContentType: 'application/json',
    }).promise();

    return success({ message: 'Token saved' });
  } catch (err: any) {
    return error(err.message);
  }
};
