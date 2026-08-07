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
const response_1 = require("../utils/response");
const auth_1 = require("../utils/auth");
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const list = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        const userId = event.queryStringParameters?.userId || authenticatedUserId;
        if (!userId)
            return (0, response_1.error)('userId required', 400);
        const listGroups = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'expenses/', Delimiter: '/' }).promise();
        const prefixes = listGroups.CommonPrefixes?.map(p => p.Prefix) || ['expenses/non-group/'];
        let allExpenses = [];
        for (const prefix of prefixes) {
            const listExpenses = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
            const keys = listExpenses.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];
            for (const key of keys) {
                try {
                    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
                    if (obj.Body) {
                        const expense = JSON.parse(obj.Body.toString());
                        const isParticipant = expense.paidBy === userId || expense.splits.some((s) => s.userId === userId);
                        if (isParticipant) {
                            allExpenses.push(expense);
                        }
                    }
                }
                catch (e) { }
            }
        }
        allExpenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        return (0, response_1.success)(allExpenses);
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.list = list;
