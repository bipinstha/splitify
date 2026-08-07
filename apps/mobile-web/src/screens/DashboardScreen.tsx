import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { getCategory } from '../theme/categories';
import { Plus, Users, User, ArrowUpRight, ArrowDownLeft, Info, Search } from 'lucide-react-native';
import { api } from '../utils/api';
import { useAuth } from '../utils/auth';
import { formatCurrency } from '../utils/currency';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [simplified, setSimplified] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userNames, setUserNames] = useState<{ [userId: string]: string }>({});

  const getDisplayCurrency = () => {
    if (!expenses || expenses.length === 0) return 'USD';
    const counts: { [key: string]: number } = {};
    expenses.forEach(e => {
      const cur = e.currency || 'USD';
      counts[cur] = (counts[cur] || 0) + 1;
    });
    let maxCur = 'USD';
    let maxCount = 0;
    Object.keys(counts).forEach(cur => {
      if (counts[cur] > maxCount) {
        maxCount = counts[cur];
        maxCur = cur;
      }
    });
    return maxCur;
  };

  const displayCurrency = getDisplayCurrency();

  const fetchData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userId = user.userId;
      const [balanceData, expenseData] = await Promise.all([
        api.getBalances(userId),
        api.listExpenses(userId)
      ]);
      setBalances(balanceData);
      setExpenses(expenseData);
      setFilteredExpenses(expenseData);
      setSimplified(balanceData.simplifiedTransactions || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    const filtered = expenses.filter(exp => 
      exp.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredExpenses(filtered);
  }, [searchQuery, expenses]);

  useEffect(() => {
    const resolveNames = async () => {
      const ids = new Set<string>();
      simplified.forEach((t: any) => {
        if (t.from) ids.add(t.from);
        if (t.to) ids.add(t.to);
      });

      if (ids.size === 0) return;

      const namesMap: { [userId: string]: string } = { ...userNames };

      if (user) {
        namesMap[user.userId] = 'You';
      }

      let updated = false;
      for (const id of Array.from(ids)) {
        if (id === 'You') continue;
        if (namesMap[id]) continue;

        if (user && id === user.userId) {
          namesMap[id] = 'You';
          updated = true;
          continue;
        }

        if (id.includes('@') || id.startsWith('+') || id.length < 20) {
          namesMap[id] = id;
          updated = true;
          continue;
        }

        try {
          const profile = await api.getUserProfile(id);
          namesMap[id] = profile.email || profile.phone || id;
          updated = true;
        } catch (err) {
          namesMap[id] = id;
          updated = true;
        }
      }

      if (updated) {
        setUserNames(namesMap);
      }
    };

    resolveNames();
  }, [simplified, user]);

  const getUserDisplayName = (id: string) => {
    if (user && id === user.userId) return 'You';
    return userNames[id] || id;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {loading && expenses.length === 0 ? (
          <ActivityIndicator color="white" />
        ) : (
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total balance</Text>
              <Text style={[styles.summaryValue, { color: balances.totalBalance >= 0 ? COLORS.teal : COLORS.orange }]}>
                {balances.totalBalance >= 0 ? '+' : ''}{formatCurrency(balances.totalBalance, displayCurrency)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>You owe</Text>
              <Text style={[styles.summaryValue, { color: COLORS.orange }]}>{formatCurrency(balances.youOwe, displayCurrency)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>You are owed</Text>
              <Text style={[styles.summaryValue, { color: COLORS.teal }]}>{formatCurrency(balances.youAreOwed, displayCurrency)}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.listContainer}>
        {simplified.length > 0 && (
          <View style={styles.simplifiedBox}>
            <View style={styles.simplifiedHeader}>
              <Info size={16} color={COLORS.primary} />
              <Text style={styles.simplifiedTitle}>Simplified Settlements</Text>
            </View>
            {simplified.map((t, i) => (
              <Text key={i} style={styles.simplifiedText}>
                <Text style={styles.bold}>{getUserDisplayName(t.from)}</Text> pays <Text style={styles.bold}>{getUserDisplayName(t.to)}</Text> <Text style={styles.tealText}>{formatCurrency(t.amount, displayCurrency)}</Text>
              </Text>
            ))}
          </View>
        )}

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Recent Activity</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity onPress={() => navigation.navigate('SettleUp')} style={{ marginRight: SPACING.md }}>
              <Text style={styles.viewAll}>Settle Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchData}>
              <Text style={styles.viewAll}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={18} color={COLORS.textSecondary} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Search expenses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={COLORS.textSecondary}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearch}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          data={filteredExpenses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const userId = user?.userId;
            const isPayer = item.paidBy === userId || 
                            (user?.email && item.paidBy === user.email) || 
                            (user?.username && item.paidBy === user.username);
            const mySplit = item.splits?.find((s: any) => 
              s.userId === userId || 
              (user?.email && s.userId === user.email) || 
              (user?.username && s.userId === user.username)
            );
            const category = getCategory(item.category);
            
            let displayAmount = 0;
            if (isPayer) {
              displayAmount = item.amount - (mySplit?.owed || 0);
            } else {
              displayAmount = mySplit?.owed || 0;
            }

            const isPersonal = isPayer && displayAmount === 0;

            return (
              <TouchableOpacity 
                style={styles.expenseItem}
                onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
              >
                <View style={[styles.expenseIcon, { backgroundColor: category.color + '1A' }]}>
                  <category.icon size={20} color={category.color} />
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDesc}>{item.description}</Text>
                  <Text style={styles.expenseSub}>
                    {isPersonal ? 'You paid' : (isPayer ? 'You lent' : 'You borrowed')}
                  </Text>
                </View>
                <View style={styles.expenseAmountContainer}>
                  <Text style={[
                    styles.expenseAmount, 
                    { color: isPersonal ? COLORS.textSecondary : (isPayer ? COLORS.teal : COLORS.orange) }
                  ]}>
                    {formatCurrency(isPersonal ? item.amount : displayAmount, item.currency)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          refreshing={loading}
          onRefresh={fetchData}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Text style={{ color: COLORS.textSecondary }}>
                {searchQuery !== '' ? 'No matching expenses found.' : 'No expenses yet!'}
              </Text>
            </View>
          }
        />
      </View>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('AddExpense')}
      >
        <Plus color="white" size={30} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { backgroundColor: COLORS.primary, paddingTop: SPACING.md, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.md },
  summaryCard: { backgroundColor: 'white', borderRadius: 12, flexDirection: 'row', padding: SPACING.md, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },
  divider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  listContainer: { flex: 1, paddingHorizontal: SPACING.md, marginTop: -SPACING.md, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: 'white' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.lg },
  listTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  viewAll: { color: COLORS.primary, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: 10, marginBottom: SPACING.md },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 16, color: COLORS.text },
  clearSearch: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  simplifiedBox: { backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: 12, marginTop: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '33' },
  simplifiedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  simplifiedTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginLeft: 6 },
  simplifiedText: { fontSize: 13, color: COLORS.text, marginBottom: 4 },
  bold: { fontWeight: '700' },
  tealText: { color: COLORS.teal, fontWeight: '700' },
  expenseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  expenseIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  expenseSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  expenseAmountContainer: { alignItems: 'flex-end' },
  expenseAmount: { fontSize: 16, fontWeight: '700' },
  itemSeparator: { height: 1, backgroundColor: COLORS.border },
  fab: { position: 'absolute', bottom: 30, right: 30, width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
});
