import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput } from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { getCategory } from '../theme/categories';
import { Plus, Users, User, ArrowUpRight, ArrowDownLeft, Info, Search } from 'lucide-react-native';
import { api } from '../utils/api';

export default function DashboardScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [simplified, setSimplified] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = 'user_123';
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
                {balances.totalBalance >= 0 ? '+' : ''} ${balances.totalBalance.toFixed(2)}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>You owe</Text>
              <Text style={[styles.summaryValue, { color: COLORS.orange }]}>${balances.youOwe.toFixed(2)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>You are owed</Text>
              <Text style={[styles.summaryValue, { color: COLORS.teal }]}>${balances.youAreOwed.toFixed(2)}</Text>
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
                <Text style={styles.bold}>{t.from}</Text> pays <Text style={styles.bold}>{t.to}</Text> <Text style={styles.tealText}>${t.amount.toFixed(2)}</Text>
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
            const userId = 'user_123';
            const isPayer = item.paidBy === userId;
            const mySplit = item.splits?.find((s: any) => s.userId === userId);
            const category = getCategory(item.category);
            
            let displayAmount = 0;
            if (isPayer) {
              displayAmount = item.amount - (mySplit?.owed || 0);
            } else {
              displayAmount = mySplit?.owed || 0;
            }

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
                    {isPayer ? 'You lent' : 'You borrowed'}
                  </Text>
                </View>
                <View style={styles.expenseAmountContainer}>
                  <Text style={[styles.expenseAmount, { color: isPayer ? COLORS.teal : COLORS.orange }]}>
                    ${displayAmount.toFixed(2)}
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
