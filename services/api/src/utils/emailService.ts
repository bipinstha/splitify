import SES from 'aws-sdk/clients/ses';

const ses = new SES();
const FROM_EMAIL = process.env.VERIFIED_EMAIL || 'notifications@splitify.app'; // Must be verified in SES

export const sendExpenseEmail = async (toEmail: string, payerName: string, description: string, amount: number, currency: string) => {
  const params = {
    Destination: {
      ToAddresses: [toEmail]
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #5851DB;">New Expense on Splitify</h2>
              <p>Hi there,</p>
              <p><strong>${payerName}</strong> just added a new expense: <strong>"${description}"</strong>.</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #666;">Total Amount</p>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0;">${currency} ${amount.toFixed(2)}</p>
              </div>
              <p>Log in to the app to see your share and settle up!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #999;">You received this because you are part of a shared group on Splitify.</p>
            </div>
          `
        },
        Text: {
          Charset: "UTF-8",
          Data: `${payerName} added a new expense: "${description}". Total: ${currency} ${amount.toFixed(2)}`
        }
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Splitify: ${description}`
      }
    },
    Source: FROM_EMAIL
  };

  try {
    await ses.sendEmail(params).promise();
    console.log(`Email sent to ${toEmail}`);
  } catch (error) {
    console.error('Failed to send email via SES:', error);
  }
};

export const sendSettlementEmail = async (toEmail: string, fromName: string, amount: number, currency: string) => {
  const params = {
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
              <h2 style="color: #2ECC71;">Payment Received</h2>
              <p><strong>${fromName}</strong> just settled up with you!</p>
              <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #666;">Amount Settled</p>
                <p style="font-size: 24px; font-weight: bold; margin: 5px 0; color: #2ECC71;">${currency} ${amount.toFixed(2)}</p>
              </div>
              <p>Your balances have been updated.</p>
            </div>
          `
        }
      },
      Subject: { Data: `Splitify: Payment received from ${fromName}` }
    },
    Source: FROM_EMAIL
  };

  try {
    await ses.sendEmail(params).promise();
  } catch (error) {
    console.error('Failed to send settlement email:', error);
  }
};
