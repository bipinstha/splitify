import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, error } from './utils/response';

import * as expenseService from './services/expenseService';
import * as groupService from './services/groupService';
import * as balanceService from './services/balanceService';
import * as attachmentService from './services/attachmentService';
import * as userService from './services/userService';
import * as analyticsService from './services/analyticsService';
import * as activityService from './services/activityService';
import * as commentService from './services/commentService';
import * as settlementService from './services/settlementService';

export const main = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const method = (event.httpMethod || '').toUpperCase();
  const rawPath = event.path || '/';
  // Normalize trailing slashes
  const path = rawPath.length > 1 && rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;

  // Handle CORS preflight OPTIONS requests centrally
  if (method === 'OPTIONS') {
    return success({ message: 'OK' });
  }

  try {
    switch (`${method} ${path}`) {
      // Expenses
      case 'POST /expenses':
        return await expenseService.create(event);
      case 'GET /expenses':
        return await expenseService.list(event);
      case 'PUT /expenses':
        return await expenseService.update(event);
      case 'DELETE /expenses':
        return await expenseService.remove(event);

      // Attachments
      case 'POST /attachments/upload-url':
        return await attachmentService.getUploadUrl(event);

      // Groups
      case 'POST /groups':
        return await groupService.create(event);
      case 'GET /groups':
        return await groupService.list(event);
      case 'PUT /groups':
        return await groupService.update(event);
      case 'DELETE /groups':
        return await groupService.remove(event);
      case 'POST /groups/invite':
        return await groupService.invite(event);
      case 'GET /groups/analytics':
        return await analyticsService.getGroupAnalytics(event);

      // Users
      case 'GET /users/profile':
        return await groupService.profile(event);
      case 'POST /users/push-token':
        return await userService.saveToken(event);

      // Balances & Settlements
      case 'GET /balances':
        return await balanceService.get(event);
      case 'POST /settlements':
        return await settlementService.create(event);

      // Activities
      case 'GET /activities':
        return await activityService.list(event);

      // Comments
      case 'POST /comments':
        return await commentService.add(event);
      case 'GET /comments':
        return await commentService.list(event);

      default:
        return error(`Route not found: ${method} ${path}`, 404);
    }
  } catch (err: any) {
    console.error(`Error executing ${method} ${path}:`, err);
    return error('Internal Server Error', 500, err.message);
  }
};
