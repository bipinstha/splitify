import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, body: JSON.stringify({ message: 'userId required' }) };

    // List activities from ALL group folders
    const listFolders = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: 'activities/',
      Delimiter: '/'
    }).promise();

    const prefixes = listFolders.CommonPrefixes?.map(p => p.Prefix) || ['activities/non-group/'];
    let allActivities: any[] = [];

    for (const prefix of prefixes) {
      const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listObjects.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

      const results = await Promise.all(
        keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key! }).promise())
      );

      results.forEach(obj => {
        if (obj.Body) {
          const activity = JSON.parse(obj.Body.toString());
          // In a real app, we'd filter for activities the user is allowed to see
          allActivities.push(activity);
        }
      });
    }

    // Sort by timestamp descending
    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(allActivities),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
