"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.invite = exports.list = exports.create = void 0;
const AWS = __importStar(require("aws-sdk"));
const uuid_1 = require("uuid");
const activityLogger_1 = require("../utils/activityLogger");
const notificationService_1 = require("../utils/notificationService");
const response_1 = require("../utils/response");
const auth_1 = require("../utils/auth");
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const create = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        if (!event.body)
            return (0, response_1.error)('Missing body', 400);
        const { name, type, members, createdBy } = JSON.parse(event.body);
        const finalCreatedBy = createdBy || authenticatedUserId;
        if (!name || !finalCreatedBy)
            return (0, response_1.error)('Name and createdBy required', 400);
        const groupId = `group_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
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
        await (0, activityLogger_1.logActivity)(finalCreatedBy, 'CREATE_GROUP', `created the group "${name}"`, groupId);
        return (0, response_1.success)(groupData, 201);
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.create = create;
const list = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        const userId = event.queryStringParameters?.userId || authenticatedUserId;
        if (!userId)
            return (0, response_1.error)('userId required', 400);
        const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'groups/', Delimiter: '/' }).promise();
        const prefixes = listObjects.CommonPrefixes?.map(p => p.Prefix) || [];
        let userGroups = [];
        for (const prefix of prefixes) {
            try {
                const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: `${prefix}metadata.json` }).promise();
                if (obj.Body) {
                    const group = JSON.parse(obj.Body.toString());
                    if (group.members.includes(userId))
                        userGroups.push(group);
                }
            }
            catch (e) { }
        }
        return (0, response_1.success)(userGroups);
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.list = list;
const invite = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        if (!event.body)
            return (0, response_1.error)('Missing body', 400);
        const { groupId, email } = JSON.parse(event.body);
        if (!groupId || !email)
            return (0, response_1.error)('GroupId and email required', 400);
        const groupKey = `groups/${groupId}/metadata.json`;
        const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: groupKey }).promise();
        if (!obj.Body)
            return (0, response_1.error)('Group not found', 404);
        const group = JSON.parse(obj.Body.toString());
        if (!group.members.includes(email)) {
            group.members.push(email);
            await s3.putObject({ Bucket: BUCKET_NAME, Key: groupKey, Body: JSON.stringify(group), ContentType: 'application/json' }).promise();
            // Notify the invited user
            try {
                await (0, notificationService_1.sendNotification)(email, 'New Group Invite', `You've been added to the group "${group.name}"`);
            }
            catch (e) {
                console.error('Failed to send invite notification', e);
            }
        }
        await (0, activityLogger_1.logActivity)(authenticatedUserId, 'INVITE_MEMBER', `added ${email} to the group`, groupId);
        return (0, response_1.success)(group);
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.invite = invite;
