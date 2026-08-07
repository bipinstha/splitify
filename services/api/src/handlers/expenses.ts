import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../utils/activityLogger';
import { sendNotification } from '../utils/notificationService';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return error('Missing request body', 400);
    
    const authenticatedUserId = getUserId(event);
    const data = JSON.parse(event.body);
    const { description, amount, groupId, paidBy, splitType, splits, category, currency, attachmentKey } = data;

    const finalPaidBy = paidBy || authenticatedUserId;

    if (!description || !amount || !finalPaidBy) {
      return error('Description, amount, and paidBy are required', 400);
    }

    const expenseId = `exp_${Date.now()}_${uuidv4().substring(0, 8)}`;
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

    await logActivity(finalPaidBy, 'CREATE_EXPENSE', `added "${description}"`, expenseRecord.groupId, { expenseId });

    // PUSH NOTIFICATIONS
    try {
      const notifications = finalSplits
        .filter((s: any) => s.userId !== finalPaidBy)
        .map((s: any) => sendNotification(
          s.userId, 
          'New Expense', 
          `${finalPaidBy} added "${description}" - you owe ${selectedCurrency} ${s.owed.toFixed(2)}`,
          { 
            type: 'expense', 
            payerName: finalPaidBy, 
            description, 
            amount: s.owed, 
            currency: selectedCurrency 
          }
        ));
      await Promise.all(notifications);
    } catch (e) {
      console.error('Failed to send notifications', e);
    }

    return success(expenseRecord, 201);
  } catch (err: any) {
    return error('Internal Server Error', 500, err.message);
  }
};

export const remove = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const expenseId = event.queryStringParameters?.id;
    const groupId = event.queryStringParameters?.groupId || 'non-group';
    if (!expenseId) return error('id required', 400);

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: `expenses/${groupId}/${expenseId}.json`,
    }).promise();

    await logActivity(authenticatedUserId, 'DELETE_EXPENSE', `deleted an expense`, groupId, { expenseId });

    return success({ message: 'Expense deleted' });
  } catch (err: any) {
    return error(err.message);
  }
};

export const update = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    if (!event.body) return error('Missing body', 400);
    const data = JSON.parse(event.body);
    const { id, originalGroupId, groupId, description, amount, splits, category, currency } = data;
    if (!id) return error('id required', 400);

    const sourceGroupId = originalGroupId || groupId || 'non-group';
    const destGroupId = groupId || 'non-group';

    const sourceS3Key = `expenses/${sourceGroupId}/${id}.json`;
    const destS3Key = `expenses/${destGroupId}/${id}.json`;

    const existing = await s3.getObject({ Bucket: BUCKET_NAME, Key: sourceS3Key }).promise();
    if (!existing.Body) return error('Not found', 404);
    
    const expense = JSON.parse(existing.Body.toString());
    const updatedExpense = {
      ...expense,
      groupId: destGroupId,
      description: description || expense.description,
      amount: amount ? parseFloat(amount) : expense.amount,
      currency: currency ? currency.toUpperCase() : expense.currency,
      splits: splits || expense.splits,
      category: category || expense.category,
      updatedAt: new Date().toISOString(),
    };

    await s3.putObject({ 
      Bucket: BUCKET_NAME, 
      Key: destS3Key, 
      Body: JSON.stringify(updatedExpense), 
      ContentType: 'application/json' 
    }).promise();

    if (sourceS3Key !== destS3Key) {
      await s3.deleteObject({ Bucket: BUCKET_NAME, Key: sourceS3Key }).promise();
    }

    await logActivity(authenticatedUserId, 'UPDATE_EXPENSE', `updated "${updatedExpense.description}"`, destGroupId, { expenseId: id });

    return success(updatedExpense);
  } catch (err: any) {
    return error(err.message);
  }
};
