# Splitify Mobile App Login Debug Guide

## Issue
Login attempts fail with "Unknown: An unknown error has occurred" error messages.

## Improved Error Logging
✅ **Fixed:** LoginScreen now logs full error details including:
- `error.code` (specific error code)
- `error.message` (error message)
- Full error object as JSON

**What to do:** Run the app again and check the console logs for detailed error information.

---

## Common Issues & Solutions

### 1. **AWS Cognito User Pool Not Configured**
**Symptoms:** Unknown error or network error
**Check:**
```bash
# Verify these values in src/aws-exports.ts match your AWS account:
- aws_user_pools_id: "us-east-1_HY6t0jZ9a"
- aws_user_pools_web_client_id: "78fp1c6ffrj4rdblfhbscj9dbr"
```

**Solution:**
- Go to AWS Cognito console
- Verify the User Pool exists with ID `us-east-1_HY6t0jZ9a`
- Verify the App Client ID matches `78fp1c6ffrj4rdblfhbscj9dbr`
- Create a test user in the pool if needed:
  1. In Cognito → User pools → Users and groups
  2. Create new user with test credentials
  3. Set temporary password and mark as confirmed

### 2. **No Users Created in Cognito**
**Symptoms:** "UserNotFoundException" error
**Solution:** Create a test user in AWS Cognito User Pool before login

### 3. **Network/Connectivity Issues**
**Symptoms:** Timeout errors or unknown errors
**Check:**
- Is your device/simulator connected to internet?
- Can you reach AWS endpoints?
- Try with valid AWS credentials in the config

**Solution:**
```bash
# In your terminal, test AWS connectivity:
curl -I https://cognito-idp.us-east-1.amazonaws.com
```

### 4. **Incorrect Email/Password**
**Symptoms:** "NotAuthorizedException" error
**Solution:** Verify credentials match the Cognito user pool user account

### 5. **User Not Confirmed**
**Symptoms:** "UserNotConfirmedException" error
**Solution:** Go to AWS Cognito console and mark user as "Confirmed" in the Users section

---

## Next Steps

1. **Run the app again** with the improved error logging
2. **Check the console logs** for specific error codes
3. **Match the error code** against the Common Issues section above
4. **Implement the solution** for that specific error

## Console Logs Location

### iOS Simulator:
```
Xcode Console or npx react-native log-ios
```

### Android Emulator:
```
npx react-native log-android
```

### Expo:
```
Open Expo app → Project → Check console tab
```

---

## AWS Cognito Setup Checklist

- [ ] Cognito User Pool exists in `us-east-1`
- [ ] User Pool ID matches: `us-east-1_HY6t0jZ9a`
- [ ] App Client ID matches: `78fp1c6ffrj4rdblfhbscj9dbr`
- [ ] At least one test user exists
- [ ] Test user is marked as "CONFIRMED" status
- [ ] Test user has a password set
- [ ] Cognito is in the same AWS region as config

---

## Additional Resources

- [AWS Amplify Auth Documentation](https://docs.amplify.aws/react-native/build-a-backend/auth/concepts/)
- [AWS Cognito User Pool Setup](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html)
