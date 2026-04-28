import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const s3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const getUploadUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { fileName, contentType, expenseId } = JSON.parse(event.body || '{}');
    
    if (!fileName || !contentType) {
      return { statusCode: 400, body: JSON.stringify({ message: 'fileName and contentType required' }) };
    }

    const key = `attachments/${expenseId || 'temp'}/${uuidv4()}_${fileName}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ uploadUrl, key }),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
