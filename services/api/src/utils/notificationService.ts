import S3 from 'aws-sdk/clients/s3';
import SNS from 'aws-sdk/clients/sns';
import axios from 'axios';
import { sendExpenseEmail } from './emailService';

const s3 = new S3();
const sns = new SNS();
const BUCKET_NAME = process.env.DATA_BUCKET || '';
const TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN || '';

export const sendNotification = async (userId: string, title: string, body: string, data?: any) => {
  try {
    const key = `users/${userId}/profile.json`;
    const obj = await s3.getObject({ Bucket: BUCKET_NAME, Key: key }).promise();
    if (!obj.Body) return;

    const profile = JSON.parse(obj.Body.toString());
    
    // 1. Push Notifications (SNS/Expo)
    const tokens = profile.pushTokens || [];
    if (tokens.length > 0) {
      if (TOPIC_ARN && profile.snsEndpointArn) {
        await sns.publish({
          TargetArn: profile.snsEndpointArn,
          Message: JSON.stringify({
            default: body,
            GCM: JSON.stringify({ notification: { title, body, data } }),
            APNS: JSON.stringify({ aps: { alert: { title, body }, data } }),
          }),
          MessageStructure: 'json',
        }).promise();
      }

      const expoMessages = tokens
        .filter((t: string) => t.startsWith('ExponentPushToken'))
        .map((token: string) => ({
          to: token,
          sound: 'default',
          title,
          body,
          data,
        }));

      if (expoMessages.length > 0) {
        await axios.post('https://exp.host/--/api/v2/push/send', expoMessages);
      }
    }

    // 2. Email Alerts (if enabled in user profile, or by default for now)
    if (profile.emailNotifications !== false && profile.email) {
      // If it's an expense notification, use the formatted email template
      if (data?.type === 'expense' || title.includes('Expense')) {
        await sendExpenseEmail(
          profile.email, 
          data?.payerName || 'A friend', 
          data?.description || 'new expense', 
          data?.amount || 0, 
          data?.currency || 'USD'
        );
      }
    }
  } catch (error) {
    console.error('Push/Email Notification Error:', error);
  }
};
