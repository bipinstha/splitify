import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, Check, User, ChevronRight } from 'lucide-react-native';
import { api } from '../utils/api';
import { useAuth } from '../utils/auth';

export default function SettleUpScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [friendBalances, setFriendBalances] = useState<any[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, [user]);

  const fetchBalances = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getBalances(user.userId);
      // Only show people you owe (balance < 0)
      setFriendBalances(data.friendBalances || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selectedFriend || !amount || !user) {
      Alert.alert('Error', 'Please select a friend and enter an amount');
      return;
    }

    setSaving(true);
    try {
      await api.settleUp(selectedFriend.friendId, amount);
      Alert.alert('Success', 'Settlement recorded!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record settlement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settle up</Text>
        <TouchableOpacity onPress={handleSettle} disabled={saving || !selectedFriend}>
          {saving ? <ActivityIndicator size="small" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!selectedFriend ? (
          <>
            <Text style={styles.sectionTitle}>Select a friend to settle with</Text>
            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={friendBalances}
                keyExtractor={(item) => item.friendId}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.friendItem}
                    onPress={() => {
                      setSelectedFriend(item);
                      setAmount(Math.abs(item.balance).toString());
                    }}
                  >
                    <View style={styles.avatar}>
                      <User size={20} color={COLORS.textSecondary} />
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.friendId}</Text>
                      <Text style={[styles.friendBalance, { color: item.balance < 0 ? COLORS.orange : COLORS.teal }]}>
                        {item.balance < 0 ? `You owe $${Math.abs(item.balance).toFixed(2)}` : `Owes you $${item.balance.toFixed(2)}`}
                      </Text>
                    </View>
                    <ChevronRight color={COLORS.border} size={20} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ color: COLORS.textSecondary }}>No balances to settle!</Text>
                  </View>
                }
              />
            )}
          </>
        ) : (
          <View style={styles.settleContainer}>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>You are paying</Text>
              <Text style={styles.friendNameLarge}>{selectedFriend.friendId}</Text>
            </View>

            <View style={styles.amountInputRow}>
              <Text style={styles.currency}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <TouchableOpacity 
              style={styles.changeFriend}
              onPress={() => setSelectedFriend(null)}
            >
              <Text style={styles.changeFriendText}>Change friend</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  friendBalance: {
    fontSize: 14,
    marginTop: 2,
  },
  settleContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  summary: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  summaryText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  friendNameLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
  },
  currency: {
    fontSize: 32,
    color: COLORS.text,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 100,
    textAlign: 'center',
  },
  changeFriend: {
    marginTop: SPACING.xl * 2,
  },
  changeFriendText: {
    color: COLORS.primary,
    fontWeight: '600',
  }
});
