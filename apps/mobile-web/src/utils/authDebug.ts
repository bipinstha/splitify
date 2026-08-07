import { fetchAuthSession, signIn } from 'aws-amplify/auth';
import awsconfig from '../aws-exports';

/**
 * Debug utility to check if Amplify is properly configured
 */
export const debugAmplifyConfig = async () => {
  console.log('[AUTH_DEBUG] ========== AMPLIFY CONFIG CHECK ==========');
  
  // Check config
  console.log('[AUTH_DEBUG] AWS Region:', awsconfig.aws_project_region);
  console.log('[AUTH_DEBUG] Cognito Region:', awsconfig.aws_cognito_region);
  console.log('[AUTH_DEBUG] User Pool ID:', awsconfig.aws_user_pools_id);
  console.log('[AUTH_DEBUG] Client ID:', awsconfig.aws_user_pools_web_client_id);
  console.log('[AUTH_DEBUG] OAuth Domain:', awsconfig.oauth?.domain);
  
  try {
    // Try to get current session
    const session = await fetchAuthSession();
    console.log('[AUTH_DEBUG] Current Session:', {
      isAuthenticated: !!session.credentials,
      hasTokens: !!session.tokens
    });
  } catch (error: any) {
    console.log('[AUTH_DEBUG] No active session (expected on first load)');
    console.error('[AUTH_DEBUG] Session Error:', error.message);
  }
};

/**
 * Enhanced error details for debugging signIn failures
 */
export const getDetailedAuthError = (error: any): string => {
  const details: string[] = [];
  
  // Check if this is an Amplify error
  if (error.name === 'Unknown' && !error.underlyingError) {
    details.push('CONFIG ISSUE: Amplify cannot reach Cognito service');
    details.push('Possible causes:');
    details.push('  1. User Pool ID is incorrect or pool doesn\'t exist');
    details.push('  2. App Client ID is incorrect');
    details.push('  3. Network connectivity issue');
    details.push('  4. Cognito region mismatch');
  } else if (error.code === 'NotAuthorizedException') {
    details.push('INVALID CREDENTIALS: Email or password is incorrect');
  } else if (error.code === 'UserNotFoundException') {
    details.push('USER NOT FOUND: This email is not registered');
    details.push('Suggestion: Create a new account or check email spelling');
  } else if (error.code === 'UserNotConfirmedException') {
    details.push('EMAIL NOT VERIFIED: Check your email for verification link');
  } else if (error.code === 'InvalidParameterException') {
    details.push('INVALID INPUT: Check username/password format');
  } else {
    details.push(`ERROR: ${error.code || error.name}`);
    details.push(`MESSAGE: ${error.message}`);
  }
  
  return details.join('\n');
};

/**
 * Verify Cognito connection with test credentials
 */
export const testCognitoConnection = async (testEmail: string, testPassword: string) => {
  console.log('[AUTH_DEBUG] Testing Cognito connection...');
  
  try {
    // This will attempt to verify connectivity without actually signing in
    console.log('[AUTH_DEBUG] Attempting test login...');
    await signIn({
      username: testEmail,
      password: testPassword,
    });
    
    console.log('[AUTH_DEBUG] ✅ TEST LOGIN SUCCESSFUL');
    return { success: true, message: 'Cognito connection working' };
  } catch (error: any) {
    console.error('[AUTH_DEBUG] ❌ TEST LOGIN FAILED:', error);
    return {
      success: false,
      message: getDetailedAuthError(error),
      errorCode: error.code,
      errorName: error.name
    };
  }
};
