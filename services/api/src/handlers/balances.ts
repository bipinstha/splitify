import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import S3 from 'aws-sdk/clients/s3';
import { success, error } from '../utils/response';
import { getUserId } from '../utils/auth';
import { simplifyDebts } from '../utils/simplifier';

const s3 = new S3();
const BUCKET_NAME = process.env.DATA_BUCKET || '';

export const get = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const authenticatedUserId = getUserId(event);
    const userId = event.queryStringParameters?.userId || authenticatedUserId;
    if (!userId) return error('userId required', 400);

    const authorizer = event.requestContext?.authorizer;
    const userEmail = authorizer?.claims?.email;
    const userPhone = authorizer?.claims?.phone_number;

    const listGroups = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'expenses/', Delimiter: '/' }).promise();
    const prefixes = Array.from(new Set([
      'expenses/non-group/',
      ...(listGroups.CommonPrefixes?.map(p => p.Prefix).filter(Boolean) || [])
    ]));

    let totalBalance = 0;
    let youOwe = 0;
    let youAreOwed = 0;
    const friendBalances: { [key: string]: number } = {};

    const groupBalances: { [groupId: string]: { [userId: string]: number } } = {};
    const pairwiseBalances: { [pairKey: string]: number } = {};

    const getGroupBalanceMap = (gId: string) => {
      const id = gId || 'non-group';
      if (!groupBalances[id]) {
        groupBalances[id] = {};
      }
      return groupBalances[id];
    };

    for (const prefix of prefixes) {
      const listExpenses = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: prefix }).promise();
      const keys = listExpenses.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];

      for (const key of keys) {
        try {
          const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key as string }).promise();
          if (!obj.Body) continue;
          const expense = JSON.parse(obj.Body.toString());
          const payer = expense.paidBy;
          const gId = expense.groupId || 'non-group';

          expense.splits.forEach((split: any) => {
            if (split.userId === payer) return;

            if (gId === 'non-group') {
              const [u1, u2] = [payer, split.userId].sort();
              const pairKey = `${u1}_${u2}`;
              const multiplier = payer === u1 ? 1 : -1;
              pairwiseBalances[pairKey] = (pairwiseBalances[pairKey] || 0) + (split.owed * multiplier);
            } else {
              const balMap = getGroupBalanceMap(gId);
              balMap[payer] = (balMap[payer] || 0) + split.owed;
              balMap[split.userId] = (balMap[split.userId] || 0) - split.owed;
            }

            const isPayer = payer === userId || (userEmail && payer === userEmail) || (userPhone && payer === userPhone);
            const isSplitMember = split.userId === userId || (userEmail && split.userId === userEmail) || (userPhone && split.userId === userPhone);

            if (isPayer) {
              totalBalance += split.owed;
              youAreOwed += split.owed;
              friendBalances[split.userId] = (friendBalances[split.userId] || 0) + split.owed;
            } else if (isSplitMember) {
              totalBalance -= split.owed;
              youOwe += split.owed;
              friendBalances[payer] = (friendBalances[payer] || 0) - split.owed;
            }
          });
        } catch (e) {}
      }
    }

    const settlementList = await s3.listObjectsV2({ Bucket: BUCKET_NAME, Prefix: 'settlements/' }).promise();
    const settlementKeys = settlementList.Contents?.map(c => c.Key).filter(k => k?.endsWith('.json')) || [];
    for (const key of settlementKeys) {
      try {
        const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key as string }).promise();
        if (!obj.Body) continue;
        const s = JSON.parse(obj.Body.toString());
        const gId = s.groupId || 'non-group';

        if (gId === 'non-group') {
          const [u1, u2] = [s.fromUserId, s.toUserId].sort();
          const pairKey = `${u1}_${u2}`;
          const multiplier = s.fromUserId === u1 ? 1 : -1;
          pairwiseBalances[pairKey] = (pairwiseBalances[pairKey] || 0) + (s.amount * multiplier);
        } else {
          const balMap = getGroupBalanceMap(gId);
          balMap[s.fromUserId] = (balMap[s.fromUserId] || 0) + s.amount;
          balMap[s.toUserId] = (balMap[s.toUserId] || 0) - s.amount;
        }

        const isFromUser = s.fromUserId === userId || (userEmail && s.fromUserId === userEmail) || (userPhone && s.fromUserId === userPhone);
        const isToUser = s.toUserId === userId || (userEmail && s.toUserId === userEmail) || (userPhone && s.toUserId === userPhone);

        if (isFromUser) {
          totalBalance += s.amount;
          youOwe = Math.max(0, youOwe - s.amount);
          friendBalances[s.toUserId] = (friendBalances[s.toUserId] || 0) + s.amount;
        } else if (isToUser) {
          totalBalance -= s.amount;
          youAreOwed = Math.max(0, youAreOwed - s.amount);
          friendBalances[s.fromUserId] = (friendBalances[s.fromUserId] || 0) - s.amount;
        }
      } catch (e) {}
    }

    const simplifiedTransactions: any[] = [];

    Object.keys(groupBalances).forEach((gId) => {
      if (gId === 'non-group') return;
      const balMap = groupBalances[gId];
      const txs = simplifyDebts(balMap);
      simplifiedTransactions.push(...txs);
    });

    Object.keys(pairwiseBalances).forEach((pairKey) => {
      const net = pairwiseBalances[pairKey];
      if (Math.abs(net) < 0.01) return;
      const [u1, u2] = pairKey.split('_');
      if (net > 0) {
        simplifiedTransactions.push({ from: u2, to: u1, amount: Number(net.toFixed(2)) });
      } else {
        simplifiedTransactions.push({ from: u1, to: u2, amount: Number(Math.abs(net).toFixed(2)) });
      }
    });

    const matchesUser = (id: string) => {
      return id === userId || (userEmail && id === userEmail) || (userPhone && id === userPhone);
    };

    const userSimplified = simplifiedTransactions
      .filter(t => matchesUser(t.from) || matchesUser(t.to))
      .map(t => ({
        ...t,
        from: matchesUser(t.from) ? 'You' : t.from,
        to: matchesUser(t.to) ? 'You' : t.to,
      }));

    return success({
      totalBalance,
      youOwe,
      youAreOwed,
      friendBalances: Object.entries(friendBalances).map(([friendId, balance]) => ({ friendId, balance })),
      simplifiedTransactions: userSimplified,
    });
  } catch (err: any) {
    return error(err.message);
  }
};
