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
exports.logActivity = void 0;
const AWS = __importStar(require("aws-sdk"));
const uuid_1 = require("uuid");
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const logActivity = async (userId, type, message, groupId, metadata) => {
    const activityId = `act_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
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
exports.logActivity = logActivity;
