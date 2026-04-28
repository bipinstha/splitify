# S3 Data Model Strategy

Since S3 will serve as our primary data storage, we will organize data using a "Folder-as-a-Database" pattern with JSON files. This ensures low cost and simplicity for a family-scale app.

## 1. Directory Structure in S3
- `users/`: Contains user profile information.
  - `{userId}/profile.json`
- `groups/`: Contains group metadata and member lists.
  - `{groupId}/metadata.json`
- `expenses/`: Expense records partitioned by group or user.
  - `{groupId}/{expenseId}.json`
- `balances/`: Aggregated balance snapshots for fast retrieval.
  - `{groupId}/balances.json`
- `attachments/`: Binary files (receipts, images).
  - `{expenseId}/{filename}`

## 2. Example Schema: `expenses/{groupId}/{expenseId}.json`
```json
{
  "id": "exp_123",
  "groupId": "group_abc",
  "description": "Weekly Groceries",
  "amount": 150.00,
  "currency": "USD",
  "date": "2026-04-26T10:00:00Z",
  "paidBy": "user_1",
  "splitType": "equal",
  "splits": [
    { "userId": "user_1", "owed": 50.00 },
    { "userId": "user_2", "owed": 50.00 },
    { "userId": "user_3", "owed": 50.00 }
  ],
  "category": "Groceries",
  "attachmentUrl": "s3://splitify/attachments/exp_123/receipt.jpg"
}
```

## 3. Consistency Strategy
- **Concurrency:** Since S3 lacks row-level locking, Lambda functions will use S3 Object Tagging or "Conditional Writes" (if available via versioning) to prevent overwriting data during concurrent updates.
- **Indexing:** We will maintain a `manifest.json` or small index files in each group folder to avoid costly `ListObjects` calls.
