# Splitify Cognito Authentication Troubleshooting Guide

## Current Issue
```
ERROR  Detailed Login Error: [Unknown: An unknown error has occurred.]
ERROR  Error Code: undefined
ERROR  Error Message: An unknown error has occurred.
ERROR  Full Error Object: {"name":"Unknown","underlyingError":{}}
```

**Root Cause:** Amplify cannot reach or authenticate with AWS Cognito service properly.

---

## ⚡ Quick Fix Steps

### 1. **Verify Cognito User Pool Exists**
```bash
# Open AWS Console → Cognito → User Pools
# Check if this pool exists:
- Pool ID: us-east-1_HY6t0jZ9a
- Region: us-east-1
```

✅ **If it exists:** Go to Step 2
❌ **If NOT found:** You need to create it or update aws-exports.ts with correct IDs

---

### 2. **Verify App Client Configuration**
Go to: **AWS Console → Cognito → [Your Pool] → App Integration → App Clients**

Check these settings:
- ✅ Client ID: `78fp1c6ffrj4rdblfhbscj9dbr`
- ✅ **Authentication Flows** must include:
  - `ALLOW_USER_PASSWORD_AUTH`
  - `ALLOW_REFRESH_TOKEN_AUTH`
  - (Optional) `ALLOW_USER_SRP_AUTH`

**If missing any flow:**
1. Click on your app client
2. Scroll to "Authentication Flows"
3. Enable `ALLOW_USER_PASSWORD_AUTH` ← **REQUIRED**
4. Click "Save changes"

---

### 3. **Verify Test User Exists**
Go to: **AWS Console → Cognito → [Your Pool] → Users and Groups**

Check if user exists:
- Email: `bipinshrestha718@gmail.com`
- Status: **CONFIRMED** (not FORCE_CHANGE_PASSWORD)

**If user missing:**
1. Click "Create user"
2. Fill in:
   - Username: `bipinshrestha718@gmail.com`
   - Email: `bipinshrestha718@gmail.com`
   - Temporary password: `TempPass123!`
   - ✅ Check "Mark email as verified"
3. Click Create
4. The user status should show "CONFIRMED"

**If status is "FORCE_CHANGE_PASSWORD":**
1. You must set a permanent password before login works
2. Click the user
3. Go to "Actions" → "Set password"
4. Enter new password and check "Permanent"

---

### 4. **Verify Cognito Domain is Configured**
Go to: **AWS Console → Cognito → [Your Pool] → Domain name**

Check that:
- ✅ Domain exists: `splitify-auth-832439451819`
- ✅ Domain status: "Active"

---

## 🔍 Enhanced Debugging

After making changes above, run the app and check console logs for:

1. **Amplify Initialization Log:**
   ```
   [AMPLIFY] Initializing Amplify...
   [AMPLIFY] Config: { region: "us-east-1", userPoolId: "us-east-1_HY6t0jZ9a", ... }
   [AMPLIFY] ✅ Amplify initialized successfully
   ```
   ✅ If you see this, Amplify is configured correctly

2. **Login Attempt Log:**
   ```
   [LOGIN] Attempting login with username: bipinshrestha718@gmail.com
   [AUTH_DEBUG] ========== AMPLIFY CONFIG CHECK ==========
   [AUTH_DEBUG] AWS Region: us-east-1
   [AUTH_DEBUG] User Pool ID: us-east-1_HY6t0jZ9a
   [AUTH_DEBUG] Client ID: 78fp1c6ffrj4rdblfhbscj9dbr
   ```

3. **Better Error Details:**
   If login still fails, you should now see detailed error messages like:
   - `CONFIG ISSUE: Amplify cannot reach Cognito service`
   - `INVALID CREDENTIALS: Email or password is incorrect`
   - `USER NOT FOUND: This email is not registered`
   - `EMAIL NOT VERIFIED: Check your email for verification link`

---

## 🛠️ Common Solutions by Error Message

### Error: "CONFIG ISSUE: Amplify cannot reach Cognito service"

**Causes:**
1. User Pool doesn't exist with the specified ID
2. Wrong AWS region
3. Network connectivity issue
4. IAM permissions issue

**Solutions:**
- [ ] Verify pool ID in AWS Console matches `aws-exports.ts`
- [ ] Verify region is `us-east-1` in AWS Console
- [ ] Restart the Expo dev server: `npm start`
- [ ] Clear Expo cache: `npm start -- --clear`
- [ ] Check internet connection on device/simulator

---

### Error: "INVALID CREDENTIALS: Email or password is incorrect"

**Solution:**
- Double-check password is exactly correct (case-sensitive)
- Verify user exists in Cognito with that email
- Make sure user status is "CONFIRMED" not "FORCE_CHANGE_PASSWORD"

---

### Error: "USER NOT FOUND: This email is not registered"

**Solution:**
- User doesn't exist in Cognito pool
- Create test user in AWS Console following Step 3 above
- Or verify email spelling is correct

---

### Error: "EMAIL NOT VERIFIED: Check your email for verification link"

**Solution:**
- User exists but not confirmed
- Go to AWS Cognito → Users → Click user → Mark as confirmed
- Or go through signup flow to verify email first

---

## 📋 Complete Setup Checklist

- [ ] AWS Cognito User Pool exists in `us-east-1`
- [ ] Pool ID: `us-east-1_HY6t0jZ9a`
- [ ] App Client ID: `78fp1c6ffrj4rdblfhbscj9dbr`
- [ ] App Client has `ALLOW_USER_PASSWORD_AUTH` enabled
- [ ] Test user created in pool
- [ ] Test user email: `bipinshrestha718@gmail.com`
- [ ] Test user password set (not temporary)
- [ ] Test user status is **CONFIRMED**
- [ ] Cognito Domain configured and active
- [ ] Device/simulator has internet connection
- [ ] Amplify v6 properly initialized (check console logs)

---

## 🎯 Test Login Steps

1. Start the app: `npm start`
2. Check console logs for `[AMPLIFY] ✅ Amplify initialized successfully`
3. Enter credentials:
   - Email: `bipinshrestha718@gmail.com`
   - Password: (your test password)
4. Click "Log In"
5. Check console for error details

---

## 🚀 If Everything is Set Up Correctly

The app should:
1. Display `[LOGIN] Attempting login with username: bipinshrestha718@gmail.com`
2. Either succeed with navigation to main app
3. Or show a specific error (not "Unknown error")

---

## Still Having Issues?

1. **Restart Expo:** Kill and run `npm start` again
2. **Clear cache:** `npm start -- --clear`
3. **Check AWS console** for the 4 requirements in checklist
4. **Verify credentials** are exactly correct (case-sensitive)
5. **Check internet** on your device/simulator

---

## Advanced: Create User via AWS CLI (Alternative to Console)

```bash
# Install AWS CLI if needed
aws configure  # Set your AWS credentials

# Create test user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_HY6t0jZ9a \
  --username bipinshrestha718@gmail.com \
  --user-attributes Name=email,Value=bipinshrestha718@gmail.com \
  --message-action SUPPRESS \
  --region us-east-1

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_HY6t0jZ9a \
  --username bipinshrestha718@gmail.com \
  --password "P@55w0rd" \
  --permanent \
  --region us-east-1
```

---

## 📞 Support Resources

- [AWS Amplify Auth Docs](https://docs.amplify.aws/react-native/build-a-backend/auth/concepts/)
- [Cognito User Pool Setup](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-getting-started.html)
- [Amplify Auth Flow Configuration](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html)
