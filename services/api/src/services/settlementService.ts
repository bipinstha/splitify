import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../utils/activityLogger';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    if (!event.body) return error('Missing body', 400);
    const { toUserId, amount, groupId } = JSON.parse(event.body);

    if (!toUserId || !amount) return error('toUserId and amount are required', 400);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return error('Invalid amount', 400);

    const settlementId = `settlement_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const record = {
      id: settlementId,
      fromUserId: authenticatedUserId,
      toUserId,
      amount: parsedAmount,
      groupId: groupId || 'non-group',
      createdAt: new Date().toISOString(),
    };

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `settlements/${settlementId}.json`,
      Body: JSON.stringify(record),
      ContentType: 'application/json',
    }).promise();

    await logActivity(authenticatedUserId, 'SETTLE_UP', `settled up $${parsedAmount.toFixed(2)} with ${toUserId}`, record.groupId, { settlementId });

    return success(record, 201);
  } catch (err: any) {
    return error(err.message);
  }
};
