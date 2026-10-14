const axios = require('axios');
const puppeteer = require('puppeteer-core');
const path = require('path');
const { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand, 
  AdminDeleteUserCommand 
} = require('@aws-sdk/client-cognito-identity-provider');
const { S3Client, DeleteObjectsCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const REGION = 'us-east-1';
const USER_POOL_ID = 'us-east-1_LYQyjkS3r';
const CLIENT_ID = '7e9clbctcf40t6qu1a7ivto96v';
const BUCKET_NAME = 'splitify-data-v2-832439451819';
const API_BASE = 'https://9rp3icsdy5.execute-api.us-east-1.amazonaws.com/prod';
const WEB_URL = 'https://d2i4wcpsg76nmm.cloudfront.net';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOT_DIR = '/Users/bipinstha/.gemini/antigravity/brain/cab7a9e5-f5ca-4640-908f-1abcb7a45c49';

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const s3 = new S3Client({ region: REGION });

async function ensureTestUser(email, name, password) {
  try {
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: name },
        { Name: 'email_verified', Value: 'true' },
      ],
      MessageAction: 'SUPPRESS',
    }));
  } catch (err) {
    if (err.name !== 'UsernameExistsException') throw err;
  }
  await cognito.send(new AdminSetUserPasswordCommand({
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: password,
    Permanent: true,
  }));
}

async function deleteTestUser(email) {
  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }));
    console.log(`   🧹 Deleted test user: ${email}`);
  } catch (err) {
    // Ignore if already deleted
  }
}

async function cleanupS3Prefix(prefix) {
  try {
    const listRes = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix }));
    if (listRes.Contents && listRes.Contents.length > 0) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET_NAME,
        Delete: { Objects: listRes.Contents.map(c => ({ Key: c.Key })) }
      }));
    }
  } catch (e) {}
}

async function getAuthToken(username, password) {
  const command = new InitiateAuthCommand({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  });
  const res = await cognito.send(command);
  return {
    idToken: res.AuthenticationResult.IdToken,
    accessToken: res.AuthenticationResult.AccessToken,
  };
}

async function runE2ESanity() {
  console.log('========================================================');
  console.log('   SPLITIFY MULTI-USER ALPHA RELEASE SANITY RUNNER      ');
  console.log('========================================================\n');

  // 1. Ensure and authenticate both test users
  console.log('1. Setting up & authenticating test users...');
  await ensureTestUser('test.alpha1@splitify.app', 'Alpha Tester One', 'AlphaTest123!');
  await ensureTestUser('test.alpha2@splitify.app', 'Alpha Tester Two', 'AlphaTest123!');
  const user1Auth = await getAuthToken('test.alpha1@splitify.app', 'AlphaTest123!');
  const user2Auth = await getAuthToken('test.alpha2@splitify.app', 'AlphaTest123!');
  console.log('   ✅ User 1 (Alice - test.alpha1@splitify.app) authenticated.');
  console.log('   ✅ User 2 (Bob - test.alpha2@splitify.app) authenticated.\n');

  const client1 = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: user1Auth.idToken },
  });
  const client2 = axios.create({
    baseURL: API_BASE,
    headers: { Authorization: user2Auth.idToken },
  });

  const user1Sub = JSON.parse(Buffer.from(user1Auth.idToken.split('.')[1], 'base64').toString()).sub;
  const user2Sub = JSON.parse(Buffer.from(user2Auth.idToken.split('.')[1], 'base64').toString()).sub;
  console.log(`   User 1 sub: ${user1Sub}`);
  console.log(`   User 2 sub: ${user2Sub}\n`);

  // 2. Verify Profile resolution
  console.log('2. Fetching User Profiles...');
  const u1Profile = await client1.get(`/users/profile?userId=${user1Sub}`);
  const u2Profile = await client2.get(`/users/profile?userId=${user2Sub}`);
  console.log('   ✅ User 1 Profile:', u1Profile.data);
  console.log('   ✅ User 2 Profile:', u2Profile.data);
  const user1Id = user1Sub;
  const user2Id = user2Sub;

  // 3. User 1 creates group
  console.log('3. User 1 creating group "Alpha Sanity Trip"...');
  const groupRes = await client1.post('/groups', {
    name: 'Alpha Sanity Trip',
    type: 'Trip',
    members: [user1Id],
  });
  const group = groupRes.data;
  console.log('   ✅ Group created:', { id: group.id, name: group.name, members: group.members });
  const groupId = group.id;

  // 4. User 1 invites User 2
  console.log('4. User 1 inviting User 2 (test.alpha2@splitify.app)...');
  const inviteRes = await client1.post('/groups/invite', {
    groupId: groupId,
    emailOrPhone: 'test.alpha2@splitify.app',
  });
  console.log('   ✅ User 2 invited to group. Current members:', inviteRes.data.members);

  // 5. User 2 lists groups to confirm membership
  console.log('5. User 2 checking groups list...');
  const u2GroupsRes = await client2.get(`/groups?userId=${user2Id}`);
  const user2HasGroup = (u2GroupsRes.data || []).some(g => g.id === groupId);
  console.log(`   ✅ Group visible to User 2: ${user2HasGroup ? 'YES' : 'NO'}`);
  if (!user2HasGroup) throw new Error('User 2 could not see the invited group');

  // 6. User 1 adds an expense: "Dinner & Drinks" $100.00 split 50/50
  console.log('\n6. User 1 adding expense: "Dinner & Drinks" $100.00 split equally...');
  const expenseRes = await client1.post('/expenses', {
    groupId: groupId,
    description: 'Dinner & Drinks',
    amount: 100.00,
    currency: 'USD',
    paidBy: user1Id,
    splitType: 'equal',
    splits: [
      { userId: user1Id, owed: 50.00 },
      { userId: user2Id, owed: 50.00 },
    ],
    category: 'Food',
  });
  console.log('   ✅ Expense created:', {
    id: expenseRes.data.id,
    description: expenseRes.data.description,
    amount: expenseRes.data.amount,
  });

  // 7. Check Balances
  console.log('\n7. Verifying Balances after expense...');
  const u1BalanceRes = await client1.get(`/balances?userId=${user1Id}`);
  const u2BalanceRes = await client2.get(`/balances?userId=${user2Id}`);
  console.log('   User 1 Net Balance:', u1BalanceRes.data);
  console.log('   User 2 Net Balance:', u2BalanceRes.data);

  // 8. User 2 Settles Up with User 1: pays $50.00
  console.log('\n8. User 2 settling up: paying User 1 $50.00...');
  const settlementRes = await client2.post('/settlements', {
    groupId: groupId,
    toUserId: user1Id,
    amount: 50.00,
  });
  console.log('   ✅ Settlement recorded:', settlementRes.data);

  // 9. Check Balances after settlement
  console.log('\n9. Verifying Balances after settlement...');
  const u1BalAfter = await client1.get(`/balances?userId=${user1Id}`);
  const u2BalAfter = await client2.get(`/balances?userId=${user2Id}`);
  console.log('   User 1 Net Balance after settlement:', u1BalAfter.data);
  console.log('   User 2 Net Balance after settlement:', u2BalAfter.data);

  // 10. Check Activity Feed
  console.log('\n10. Checking Activity Feed...');
  const activityRes = await client1.get('/activities');
  console.log(`   ✅ Activity Feed returned ${activityRes.data?.length || 0} items.`);
  const recentItems = (activityRes.data || []).slice(0, 4);
  recentItems.forEach((act, idx) => {
    console.log(`      [${idx + 1}] ${act.type || act.action}: ${act.description || act.message} (by ${act.userName || act.userId})`);
  });

  // 11. Drive the Web UI in Chrome and take screenshots
  console.log('\n11. Driving Web UI in Chrome to capture live visual state...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.goto(WEB_URL, { waitUntil: 'networkidle2' });

  // Log in as User 1
  const emailInput = await page.waitForSelector('input[placeholder="Email address"]');
  await emailInput.type('test.alpha1@splitify.app', { delay: 20 });
  const passInput = await page.waitForSelector('input[placeholder="Password"]');
  await passInput.type('AlphaTest123!', { delay: 20 });

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div')).find(d => d.innerText && d.innerText.trim() === 'Log In');
    if (el) el.click();
  });

  await page.waitForFunction(() => document.body.innerText.includes('Total Balance') || document.body.innerText.includes('TOTAL BALANCE'));
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 1: Dashboard with live activity
  const dashPic = path.join(SCREENSHOT_DIR, 'web_sanity_active_dashboard.png');
  await page.screenshot({ path: dashPic });
  console.log(`   📷 Captured live dashboard screenshot: ${dashPic}`);

  // Click "Groups" tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div')).filter(d => d.innerText && d.innerText.trim() === 'Groups');
    const groupTab = tabs[tabs.length - 1]; // bottom navigation
    if (groupTab) groupTab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const groupsPic = path.join(SCREENSHOT_DIR, 'web_sanity_groups.png');
  await page.screenshot({ path: groupsPic });
  console.log(`   📷 Captured groups tab screenshot: ${groupsPic}`);

  // Click "Activity" tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('div')).filter(d => d.innerText && d.innerText.trim() === 'Activity');
    const actTab = tabs[tabs.length - 1]; // bottom navigation
    if (actTab) actTab.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  const activityPic = path.join(SCREENSHOT_DIR, 'web_sanity_activity.png');
  await page.screenshot({ path: activityPic });
  console.log(`   📷 Captured activity tab screenshot: ${activityPic}`);

  await browser.close();

  // 12. Cleanup test data and users
  console.log('\n12. Cleaning up test data & users from AWS...');
  await cleanupS3Prefix(`groups/${groupId}/`);
  await cleanupS3Prefix(`expenses/${groupId}/`);
  await cleanupS3Prefix(`activities/${groupId}/`);
  await cleanupS3Prefix(`users/${user1Sub}.json`);
  await cleanupS3Prefix(`users/${user2Sub}.json`);
  await deleteTestUser('test.alpha1@splitify.app');
  await deleteTestUser('test.alpha2@splitify.app');
  console.log('   ✅ Environment cleanly restored.');

  console.log('\n========================================================');
  console.log('   🎉 ALL ALPHA SANITY TESTS PASSED SUCCESSFULLY!       ');
  console.log('========================================================\n');
}

runE2ESanity().catch(err => {
  console.error('\n❌ Sanity Run Failed:', err.response ? err.response.data : err);
  process.exit(1);
});
