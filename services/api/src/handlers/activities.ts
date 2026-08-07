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

    // Build the set of groupIds this user belongs to
    const groupList = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'groups/', Delimiter: '/' }).promise();
    const groupPrefixes = groupList.CommonPrefixes?.map(p => p.Prefix) || [];
    const userGroupIds = new Set<string>();

    await Promise.all(groupPrefixes.map(async prefix => {
      try {
        const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: `${prefix}metadata.json` }).promise();
        if (obj.Body) {
          const group = JSON.parse(obj.Body.toString());
          if (group.members.includes(userId)) userGroupIds.add(group.id);
        }
      } catch (e) {}
    }));

    // Fetch activities — include if: in a group the user belongs to, OR the user's own non-group activity
    const activityList = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'activities/', Delimiter: '/' }).promise();
    const activityPrefixes = activityList.CommonPrefixes?.map(p => p.Prefix) || [];
    let allActivities: any[] = [];

    for (const prefix of activityPrefixes) {
      const listActivities = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listActivities.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

      for (const key of keys) {
        try {
          const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key as string }).promise();
          if (!obj.Body) continue;
          const activity = JSON.parse(obj.Body.toString());
          const inUserGroup = userGroupIds.has(activity.groupId);
          const isOwnNonGroup = activity.groupId === 'non-group' && activity.userId === userId;
          if (inUserGroup || isOwnNonGroup) allActivities.push(activity);
        } catch (e) {}
      }
    }

    allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return success(allActivities);
  } catch (err: any) {
    return error(err.message);
  }
};
