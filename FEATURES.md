# Splitify - Project Features & Requirements

Splitify is a cross-platform (Web, Android, iOS) expense-splitting application designed for families and friends to track shared costs.

## 1. Authentication & User Management
- **Social Login:** Integration with Google, Apple, and Facebook.
- **Manual Signup:** Email and password-based registration with email verification.
- **Profile Management:** Update profile picture, display name, and notification preferences.

## 2. Core Expense Features
- **Add Expenses:** Input amount, description, date, and category.
- **Flexible Splitting:**
  - Split equally.
  - Split by exact amounts.
  - Split by percentages.
  - Split by shares.
- **Multi-currency Support:** Record expenses in different currencies with automated conversion (optional/future).
- **Attachments:** Upload receipts or photos (stored in S3).

## 3. Group & Friend Management
- **Groups:** Create groups for trips, households, or recurring events.
- **Friends:** Add friends via email or phone number.
- **Group Balances:** Real-time view of who owes whom within a specific group.

## 4. Balances & Settlements
- **Total Balance:** Overview of net "owe" or "owed" status across all friends and groups.
- **Settle Up:** Record payments between users (Cash, PayPal, Venmo links).
- **Debt Simplification:** Automatically minimize the number of payments required to settle a group (similar to Splitwise's "Simplify Debts").

## 5. Activity & Notifications
- **Activity Feed:** History of added, edited, or deleted expenses.
- **Push Notifications:** Alerts for being added to a group, new expenses, or settlement requests.
- **Comments:** Discuss specific expenses with involved parties.

## 6. Technical Architecture (User Requirements)
- **Frontend:** Cross-platform support (Web, Android, iOS).
- **Backend API:** Hosted on **AWS Lambda** (Serverless).
- **Data Storage:** **AWS S3** for persistent data and file storage.
- **Authentication Service:** Integration with AWS Cognito or similar for social/manual auth.

## 8. Backlog & Future Enhancements
- **Debt Simplification:** Implementation of an algorithm to minimize the total number of transactions required to settle a group.
- **Multi-currency Support:** Automated currency conversion using live exchange rate APIs.
- **Receipt OCR Scanning:** Integration with AWS Textract to extract expense details from images automatically.
- **Recurring Expenses:** Support for monthly/weekly automated expense creation (e.g., rent, utilities).
- **Expense Comments:** Threaded discussions on individual expense records.
- **Payment Integration:** Direct deep-linking to PayPal, Venmo, or UPI for settlements.
- **Offline Mode:** Local data persistence and background synchronization for low-connectivity environments.
- **Advanced Exporting:** Generation of PDF summary reports and CSV data exports.
