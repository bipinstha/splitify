import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../utils/activityLogger';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ message: 'Missing body' }) };
    const { name, type, members, createdBy } = JSON.parse(event.body);
    if (!name || !createdBy) return { statusCode: 400, body: JSON.stringify({ message: 'Name and createdBy required' }) };

    const groupId = `group_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const groupData = {
      id: groupId,
      name,
      type: type || 'Other',
      members: members || [createdBy],
      createdBy,
      createdAt: new Date().toISOString(),
    };

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `groups/${groupId}/metadata.json`,
      Body: JSON.stringify(groupData),
      ContentType: 'application/json',
    }).promise();

    await logActivity(createdBy, 'CREATE_GROUP', `created the group "${name}"`, groupId);

    return { statusCode: 201, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(groupData) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return { statusCode: 400, body: JSON.stringify({ message: 'userId required' }) };

    const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'groups/', Delimiter: '/' }).promise();
    const prefixes = listObjects.CommonPrefixes?.map(p => p.Prefix) || [];
    let userGroups: any[] = [];

    for (const prefix of prefixes) {
      try {
        const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: `${prefix}metadata.json` }).promise();
        if (obj.Body) {
          const group = JSON.parse(obj.Body.toString());
          if (group.members.includes(userId)) userGroups.push(group);
        }
      } catch (e) {}
    }

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(userGroups) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};

export const invite = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ message: 'Missing body' }) };
    const { groupId, email } = JSON.parse(event.body);
    if (!groupId || !email) return { statusCode: 400, body: JSON.stringify({ message: 'GroupId and email required' }) };

    const groupKey = `groups/${groupId}/metadata.json`;
    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: groupKey }).promise();
    if (!obj.Body) return { statusCode: 404, body: JSON.stringify({ message: 'Group not found' }) };

    const group = JSON.parse(obj.Body.toString());
    if (!group.members.includes(email)) {
      group.members.push(email);
      await s3.putObject({ Bucket: BUCKET_NAME, Key: groupKey, Body: JSON.stringify(group), ContentType: 'application/json' }).promise();
    }

    await logActivity('user_123', 'INVITE_MEMBER', `added ${email} to the group`, groupId);

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(group) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
