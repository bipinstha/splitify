import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import CognitoIdentityServiceProvider from 'aws-sdk/clients/cognitoidentityserviceprovider';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../utils/activityLogger';
import { sendNotification } from '../utils/notificationService';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';

const s3 = new S3();
const cognito = new CognitoIdentityServiceProvider();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const USER_POOL_ID = process.env.USER_POOL_ID || '';

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    if (!event.body) return error('Missing body', 400);
    const { name, type, members, createdBy } = JSON.parse(event.body);
    
    const finalCreatedBy = createdBy || authenticatedUserId;
    if (!name || !finalCreatedBy) return error('Name and createdBy required', 400);

    const groupId = `group_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const groupData = {
      id: groupId,
      name,
      type: type || 'Other',
      members: members || [finalCreatedBy],
      createdBy: finalCreatedBy,
      createdAt: new Date().toISOString(),
    };

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `groups/${groupId}/metadata.json`,
      Body: JSON.stringify(groupData),
      ContentType: 'application/json',
    }).promise();

    await logActivity(finalCreatedBy, 'CREATE_GROUP', `created the group "${name}"`, groupId);

    return success(groupData, 201);
  } catch (err: any) {
    return error(err.message);
  }
};

export const list = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const userId = event.queryStringParameters?.userId || authenticatedUserId;
    if (!userId) return error('userId required', 400);

    const authorizer = event.requestContext?.authorizer;
    const userEmail = authorizer?.claims?.email;
    const userPhone = authorizer?.claims?.phone_number;

    if (userId && (userEmail || userPhone)) {
      try {
        await s3.putObject({
          Bucket: BUCKET_NAME,
          Key: `users/${userId}.json`,
          Body: JSON.stringify({ userId, email: userEmail, phone: userPhone }),
          ContentType: 'application/json'
        }).promise();
      } catch (err) {
        console.error('Failed to save user profile', err);
      }
    }

    const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'groups/', Delimiter: '/' }).promise();
    const prefixes = listObjects.CommonPrefixes?.map(p => p.Prefix) || [];
    let userGroups: any[] = [];

    for (const prefix of prefixes) {
      try {
        const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: `${prefix}metadata.json` }).promise();
        if (obj.Body) {
          const group = JSON.parse(obj.Body.toString());
          let isMember = group.members.includes(userId);
          let needsUpdate = false;

          if (!isMember) {
            const emailMatchIndex = userEmail ? group.members.indexOf(userEmail) : -1;
            const phoneMatchIndex = userPhone ? group.members.indexOf(userPhone) : -1;

            if (emailMatchIndex !== -1 || phoneMatchIndex !== -1) {
              isMember = true;
              needsUpdate = true;
              if (emailMatchIndex !== -1) group.members[emailMatchIndex] = userId;
              if (phoneMatchIndex !== -1) group.members[phoneMatchIndex] = userId;
            }
          }

          if (isMember) {
            userGroups.push(group);
            if (needsUpdate) {
              await s3.putObject({
                Bucket: BUCKET_NAME,
                Key: `${prefix}metadata.json`,
                Body: JSON.stringify(group),
                ContentType: 'application/json',
              }).promise();
            }
          }
        }
      } catch (e) {}
    }

    return success(userGroups);
  } catch (err: any) {
    return error(err.message);
  }
};

export const invite = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    if (!event.body) return error('Missing body', 400);
    const { groupId, email, emailOrPhone } = JSON.parse(event.body);
    const invitee = (emailOrPhone || email || '').trim();
    if (!groupId || !invitee) return error('GroupId and emailOrPhone required', 400);

    const groupKey = `groups/${groupId}/metadata.json`;
    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: groupKey }).promise();
    if (!obj.Body) return error('Group not found', 404);

    const group = JSON.parse(obj.Body.toString());
    if (!group.members.includes(invitee)) {
      group.members.push(invitee);
      await s3.putObject({ Bucket: BUCKET_NAME, Key: groupKey, Body: JSON.stringify(group), ContentType: 'application/json' }).promise();
      
      // Notify the invited user
      try {
        await sendNotification(invitee, 'New Group Invite', `You've been added to the group "${group.name}"`);
      } catch (e) {
        console.error('Failed to send invite notification', e);
      }
    }

    await logActivity(authenticatedUserId, 'INVITE_MEMBER', `added ${invitee} to the group`, groupId);

    return success(group);
  } catch (err: any) {
    return error(err.message);
  }
};

export const update = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const groupId = event.queryStringParameters?.id || event.queryStringParameters?.groupId;
    if (!groupId) return error('groupId required', 400);

    if (!event.body) return error('Missing body', 400);
    const { name, type } = JSON.parse(event.body);

    const groupKey = `groups/${groupId}/metadata.json`;
    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: groupKey }).promise();
    if (!obj.Body) return error('Group not found', 404);

    const group = JSON.parse(obj.Body.toString());
    
    if (!group.members.includes(authenticatedUserId)) {
      return error('Unauthorized', 403);
    }

    if (name) group.name = name;
    if (type) group.type = type;

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: groupKey,
      Body: JSON.stringify(group),
      ContentType: 'application/json',
    }).promise();

    await logActivity(authenticatedUserId, 'UPDATE_GROUP', `updated the group "${group.name}"`, groupId);

    return success(group);
  } catch (err: any) {
    return error(err.message);
  }
};

export const remove = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const groupId = event.queryStringParameters?.id || event.queryStringParameters?.groupId;
    if (!groupId) return error('groupId required', 400);

    const groupKey = `groups/${groupId}/metadata.json`;
    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: groupKey }).promise();
    if (!obj.Body) return error('Group not found', 404);

    const group = JSON.parse(obj.Body.toString());
    
    if (group.createdBy !== authenticatedUserId) {
      return error('Only group creator can delete this group', 403);
    }

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: groupKey,
    }).promise();

    const listExpenses = await s3.listObjectsV2({
      Bucket: BUCKET_NAME,
      Prefix: `expenses/${groupId}/`,
    }).promise();

    const keys = listExpenses.Contents?.map(c => c.Key).filter(Boolean) || [];
    for (const key of keys) {
      await s3.deleteObject({
        Bucket: BUCKET_NAME,
        Key: key!,
      }).promise();
    }

    await logActivity(authenticatedUserId, 'DELETE_GROUP', `deleted the group "${group.name}"`, groupId);

    return success({ message: 'Group deleted successfully' });
  } catch (err: any) {
    return error(err.message);
  }
};

export const profile = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.queryStringParameters?.userId;
    if (!userId) return error('userId is required', 400);

    const profileKey = `users/${userId}.json`;
    try {
      const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: profileKey }).promise();
      if (obj.Body) {
        return success(JSON.parse(obj.Body.toString()));
      }
    } catch (e) {
      // Not found in S3
    }

    if (USER_POOL_ID && userId.length > 20) {
      try {
        const cognitoRes = await cognito.listUsers({
          UserPoolId: USER_POOL_ID,
          Filter: `sub = "${userId}"`,
          Limit: 1
        }).promise();

        if (cognitoRes.Users && cognitoRes.Users.length > 0) {
          const cogUser = cognitoRes.Users[0];
          const attrs = cogUser.Attributes || [];
          const emailAttr = attrs.find(a => a.Name === 'email')?.Value;
          const phoneAttr = attrs.find(a => a.Name === 'phone_number')?.Value;
          const nameAttr = attrs.find(a => a.Name === 'name')?.Value;

          const resolved = {
            userId,
            email: nameAttr || emailAttr || phoneAttr || userId,
            phone: phoneAttr || userId
          };

          try {
            await s3.putObject({
              Bucket: BUCKET_NAME,
              Key: profileKey,
              Body: JSON.stringify(resolved),
              ContentType: 'application/json'
            }).promise();
          } catch (cacheErr) {
            console.error('Failed to write Cognito resolved profile to S3', cacheErr);
          }

          return success(resolved);
        }
      } catch (cognitoErr) {
        console.error('Cognito user lookup failed', cognitoErr);
      }
    }

    return success({ userId, email: userId, phone: userId });
  } catch (err: any) {
    return error(err.message);
  }
};
