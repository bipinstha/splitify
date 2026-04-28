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
exports.get = void 0;
const AWS = __importStar(require("aws-sdk"));
const simplifier_1 = require("../utils/simplifier");
const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const get = async (event) => {
    try {
        const userId = event.queryStringParameters?.userId;
        if (!userId)
            return { statusCode: 400, body: JSON.stringify({ message: 'userId required' }) };
        const listGroups = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'expenses/', Delimiter: '/' }).promise();
        const prefixes = listGroups.CommonPrefixes?.map(p => p.Prefix) || ['expenses/non-group/'];
        let youAreOwed = 0;
        let youOwe = 0;
        const userBalances = {};
        for (const prefix of prefixes) {
            const listExpenses = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
            const keys = listExpenses.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];
            const expenseObjects = await Promise.all(keys.map(key => s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise()));
            for (const obj of expenseObjects) {
                if (!obj.Body)
                    continue;
                const expense = JSON.parse(obj.Body.toString());
                const mySplit = expense.splits?.find((s) => s.userId === userId);
                if (expense.paidBy === userId) {
                    expense.splits.forEach((split) => {
                        if (split.userId !== userId) {
                            userBalances[split.userId] = (userBalances[split.userId] || 0) + split.owed;
                            youAreOwed += split.owed;
                        }
                    });
                }
                else if (mySplit) {
                    const payerId = expense.paidBy;
                    userBalances[payerId] = (userBalances[payerId] || 0) - mySplit.owed;
                    youOwe += mySplit.owed;
                }
            }
        }
        const friendBalances = Object.keys(userBalances).map(id => ({ friendId: id, balance: userBalances[id] })).filter(fb => fb.balance !== 0);
        // Simplification Logic
        const allUserBalances = { ...userBalances };
        allUserBalances[userId] = youAreOwed - youOwe;
        const simplifiedTransactions = (0, simplifier_1.simplifyDebts)(allUserBalances);
        return {
            statusCode: 200,
            headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET' },
            body: JSON.stringify({
                totalBalance: youAreOwed - youOwe,
                youOwe,
                youAreOwed,
                friendBalances,
                simplifiedTransactions,
                userId
            }),
        };
    }
    catch (error) {
        return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
    }
};
exports.get = get;
