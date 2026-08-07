import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { success, error } from '../utils/response';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const getUploadUrl = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const { fileName, contentType } = JSON.parse(event.body || '{}');
    if (!fileName || !contentType) return error('fileName and contentType required', 400);

    const key = `attachments/${Date.now()}_${fileName}`;
    const url = s3.getSignedUrl('putObject', {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: contentType,
      Expires: 300,
    });

    return success({ uploadUrl: url, key });
  } catch (err: any) {
    return error(err.message);
  }
};
