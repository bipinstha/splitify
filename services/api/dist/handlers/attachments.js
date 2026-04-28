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
exports.getUploadUrl = void 0;
const AWS = __importStar(require("aws-sdk"));
const uuid_1 = require("uuid");
const s3 = new AWS.S3({ signatureVersion: 'v4' });
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const getUploadUrl = async (event) => {
    try {
        const { fileName, contentType, expenseId } = JSON.parse(event.body || '{}');
        if (!fileName || !contentType) {
            return { statusCode: 400, body: JSON.stringify({ message: 'fileName and contentType required' }) };
        }
        const key = `attachments/${expenseId || 'temp'}/${(0, uuid_1.v4)()}_${fileName}`;
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
    }
    catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
exports.getUploadUrl = getUploadUrl;
