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
exports.update = exports.remove = exports.create = void 0;
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
        if (!event.body)
            return (0, response_1.error)('Missing request body', 400);
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        const data = JSON.parse(event.body);
        const { description, amount, groupId, paidBy, splitType, splits, category, currency, attachmentKey } = data;
        const finalPaidBy = paidBy || authenticatedUserId;
        if (!description || !amount || !finalPaidBy) {
            return (0, response_1.error)('Description, amount, and paidBy are required', 400);
        }
        const expenseId = `exp_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
        const timestamp = new Date().toISOString();
        const parsedAmount = parseFloat(amount);
        const selectedCurrency = (currency || 'USD').toUpperCase();
        let finalSplits = splits;
        if (!splits || splits.length === 0) {
            // Default to 100% for the payer if no splits provided
            finalSplits = [{ userId: finalPaidBy, owed: parsedAmount }];
        }
        const expenseRecord = {
            id: expenseId,
            groupId: groupId || 'non-group',
            description,
            amount: parsedAmount,
            currency: selectedCurrency,
            paidBy: finalPaidBy,
            splitType: splitType || 'equal',
            splits: finalSplits,
            category: category || 'General',
            attachmentKey,
            createdAt: timestamp,
            updatedAt: timestamp,
        };
        await s3.putObject({
            Bucket: BUCKET_NAME,
            Key: `expenses/${expenseRecord.groupId}/${expenseId}.json`,
            Body: JSON.stringify(expenseRecord),
            ContentType: 'application/json',
        }).promise();
        await (0, activityLogger_1.logActivity)(finalPaidBy, 'CREATE_EXPENSE', `added "${description}"`, expenseRecord.groupId, { expenseId });
        // PUSH NOTIFICATIONS
        try {
            const notifications = finalSplits
                .filter((s) => s.userId !== finalPaidBy)
                .map((s) => (0, notificationService_1.sendNotification)(s.userId, 'New Expense', `${finalPaidBy} added "${description}" - you owe ${selectedCurrency} ${s.owed.toFixed(2)}`, {
                type: 'expense',
                payerName: finalPaidBy,
                description,
                amount: s.owed,
                currency: selectedCurrency
            }));
            await Promise.all(notifications);
        }
        catch (e) {
            console.error('Failed to send notifications', e);
        }
        return (0, response_1.success)(expenseRecord, 201);
    }
    catch (err) {
        return (0, response_1.error)('Internal Server Error', 500, err.message);
    }
};
exports.create = create;
const remove = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        const expenseId = event.queryStringParameters?.id;
        const groupId = event.queryStringParameters?.groupId || 'non-group';
        if (!expenseId)
            return (0, response_1.error)('id required', 400);
        await s3.deleteObject({
            Bucket: BUCKET_NAME,
            Key: `expenses/${groupId}/${expenseId}.json`,
        }).promise();
        await (0, activityLogger_1.logActivity)(authenticatedUserId, 'DELETE_EXPENSE', `deleted an expense`, groupId, { expenseId });
        return (0, response_1.success)({ message: 'Expense deleted' });
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.remove = remove;
const update = async (event) => {
    try {
        const authenticatedUserId = (0, auth_1.getUserId)(event);
        if (!event.body)
            return (0, response_1.error)('Missing body', 400);
        const data = JSON.parse(event.body);
        const { id, groupId, description, amount, splits, category, currency } = data;
        if (!id)
            return (0, response_1.error)('id required', 400);
        const s3Key = `expenses/${groupId || 'non-group'}/${id}.json`;
        const existing = await s3.getObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
        if (!existing.Body)
            return (0, response_1.error)('Not found', 404);
        const expense = JSON.parse(existing.Body.toString());
        const updatedExpense = {
            ...expense,
            description: description || expense.description,
            amount: amount ? parseFloat(amount) : expense.amount,
            currency: currency ? currency.toUpperCase() : expense.currency,
            splits: splits || expense.splits,
            category: category || expense.category,
            updatedAt: new Date().toISOString(),
        };
        await s3.putObject({ Bucket: BUCKET_NAME, Key: s3Key, Body: JSON.stringify(updatedExpense), ContentType: 'application/json' }).promise();
        await (0, activityLogger_1.logActivity)(authenticatedUserId, 'UPDATE_EXPENSE', `updated "${updatedExpense.description}"`, groupId, { expenseId: id });
        return (0, response_1.success)(updatedExpense);
    }
    catch (err) {
        return (0, response_1.error)(err.message);
    }
};
exports.update = update;
