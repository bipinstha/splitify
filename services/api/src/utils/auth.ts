import { APIGatewayProxyEvent } from 'aws-lambda';

/**
 * Extracts the user ID (sub) from the Cognito authorizer context.
 * Returns a fallback ID if the authorizer is not present (e.g., in local development).
 */
export const getUserId = (event: APIGatewayProxyEvent): string => {
  const authorizer = event.requestContext?.authorizer;
  
  // Cognito user pool authorizer puts the 'sub' in claims
  const userId = authorizer?.claims?.sub || authorizer?.claims?.['cognito:username'] || authorizer?.principalId;
  
  if (userId) return userId;
  
  // Fallback for development/testing if no authorizer is present
  console.warn('No user ID found in authorizer context, using fallback');
  return 'anonymous';
};
