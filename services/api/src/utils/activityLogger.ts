import S3 from 'aws-sdk/clients/s3';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export type ActivityType = 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' | 'CREATE_GROUP' | 'INVITE_MEMBER' | 'SETTLE_UP';

export const logActivity = async (userId: string, type: ActivityType, message: string, groupId?: string, metadata?: any) => {
  const activityId = `act_${Date.now()}_${uuidv4().substring(0, 8)}`;
  const activity = {
    id: activityId,
    userId,
    type,
    message,
    groupId: groupId || 'non-group',
    metadata,
    timestamp: new Date().toISOString(),
  };

  await s3.putObject({
    Bucket: BUCKET_NAME,
    Key: `activities/${activity.groupId}/${activityId}.json`,
    Body: JSON.stringify(activity),
    ContentType: 'application/json',
  }).promise();
};
