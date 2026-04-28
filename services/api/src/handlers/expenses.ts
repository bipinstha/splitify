import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '../utils/activityLogger';

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const create = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ message: 'Missing request body' }) };
    
    const data = JSON.parse(event.body);
    const { description, amount, groupId, paidBy, splitType, splits, category } = data;

    if (!description || !amount || !paidBy) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Description, amount, and paidBy are required' }) };
    }

    const expenseId = `exp_${Date.now()}_${uuidv4().substring(0, 8)}`;
    const timestamp = new Date().toISOString();
    const parsedAmount = parseFloat(amount);

    let finalSplits = splits;
    if (!splits || splits.length === 0) {
      const perPerson = parsedAmount / 2;
      finalSplits = [{ userId: paidBy, owed: perPerson }, { userId: 'other_user', owed: perPerson }];
    }

    const expenseRecord = {
      id: expenseId,
      groupId: groupId || 'non-group',
      description,
      amount: parsedAmount,
      paidBy,
      splitType: splitType || 'equal',
      splits: finalSplits,
      category: category || 'General',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await s3.putObject({
      Bucket: BUCKET_NAME,
      Key: `expenses/${expenseRecord.groupId}/${expenseId}.json`,
      Body: JSON.stringify(expenseRecord),
      ContentType: 'application/json',
    }).promise();

    await logActivity(paidBy, 'CREATE_EXPENSE', `added "${description}"`, expenseRecord.groupId, { expenseId });

    return {
      statusCode: 201,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'OPTIONS,POST' },
      body: JSON.stringify(expenseRecord),
    };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
  }
};

export const remove = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const expenseId = event.queryStringParameters?.id;
    const groupId = event.queryStringParameters?.groupId || 'non-group';
    if (!expenseId) return { statusCode: 400, body: JSON.stringify({ message: 'id required' }) };

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: `expenses/${groupId}/${expenseId}.json`,
    }).promise();

    await logActivity('user_123', 'DELETE_EXPENSE', `deleted an expense`, groupId, { expenseId });

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ message: 'Expense deleted' }) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};

export const update = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return { statusCode: 400, body: JSON.stringify({ message: 'Missing body' }) };
    const data = JSON.parse(event.body);
    const { id, groupId, description, amount, splits, category } = data;
    if (!id) return { statusCode: 400, body: JSON.stringify({ message: 'id required' }) };

    const s3Key = `expenses/${groupId || 'non-group'}/${id}.json`;
    const existing = await s3.getObject({ Bucket: BUCKET_NAME, Key: s3Key }).promise();
    if (!existing.Body) return { statusCode: 404, body: JSON.stringify({ message: 'Not found' }) };
    
    const expense = JSON.parse(existing.Body.toString());
    const updatedExpense = {
      ...expense,
      description: description || expense.description,
      amount: amount ? parseFloat(amount) : expense.amount,
      splits: splits || expense.splits,
      category: category || expense.category,
      updatedAt: new Date().toISOString(),
    };

    await s3.putObject({ Bucket: BUCKET_NAME, Key: s3Key, Body: JSON.stringify(updatedExpense), ContentType: 'application/json' }).promise();

    await logActivity('user_123', 'UPDATE_EXPENSE', `updated "${updatedExpense.description}"`, groupId, { expenseId: id });

    return { statusCode: 200, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(updatedExpense) };
  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ message: error.message }) };
  }
};
