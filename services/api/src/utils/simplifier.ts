export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export function simplifyDebts(userBalances: { [userId: string]: number }): Transaction[] {
  const transactions: Transaction[] = [];

  // 1. Separate into debtors and creditors
  let debtors = Object.keys(userBalances)
    .filter(u => userBalances[u] < -0.01) // Small tolerance for floating point
    .map(u => ({ userId: u, balance: Math.abs(userBalances[u]) }))
    .sort((a, b) => b.balance - a.balance);

  let creditors = Object.keys(userBalances)
    .filter(u => userBalances[u] > 0.01)
    .map(u => ({ userId: u, balance: userBalances[u] }))
    .sort((a, b) => b.balance - a.balance);

  // 2. Greedily match largest debtor with largest creditor
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.balance, creditor.balance);
    
    if (amount > 0) {
      transactions.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: Number(amount.toFixed(2))
      });
    }

    debtor.balance -= amount;
    creditor.balance -= amount;

    if (debtor.balance < 0.01) d++;
    if (creditor.balance < 0.01) c++;
  }

  return transactions;
}
