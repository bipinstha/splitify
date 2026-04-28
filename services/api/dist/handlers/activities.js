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
exports.list = void 0;
const AWS = __importStar(require("aws-sdk"));
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const list = async (event) => {
    try {
        const userId = event.queryStringParameters?.userId;
        if (!userId)
            return { statusCode: 400, body: JSON.stringify({ message: 'userId required' }) };
        // List activities from ALL group folders
        const listFolders = await s3.listObjectsV2({
            Bucket: BUCKET_NAME,
            Prefix: 'activities/',
            Delimiter: '/'
        }).promise();
        const prefixes = listFolders.CommonPrefixes?.map(p => p.Prefix) || ['activities/non-group/'];
        let allActivities = [];
        for (const prefix of prefixes) {
            const listObjects = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
            const keys = listObjects.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];
            const results = await Promise.all(keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise()));
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
    }
    catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
exports.list = list;
