import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, Camera } from 'lucide-react-native';
import { api } from '../utils/api';

export default function EditExpenseScreen({ route, navigation }: any) {
  const { expense } = route.params;
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [saving, setSaving] = useState(false);

  const handleUpdate = async () => {
    if (!description || !amount) {
      Alert.alert('Error', 'Please enter a description and amount');
      return;
    }

    setSaving(true);
    try {
      await api.updateExpense({
        id: expense.id,
        groupId: expense.groupId,
        description,
        amount,
      });
      // Pop twice to go back to Dashboard (from Edit -> Detail -> Dashboard)
      // or just once if we want to refresh detail. 
      // For simplicity, let's go back once and the detail screen should ideally refresh.
      navigation.navigate('Main'); 
    } catch (error) {
      Alert.alert('Error', 'Failed to update expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}>
            <X color={COLORS.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit expense</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={saving}>
            {saving ? <ActivityIndicator size="small" /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.inputSection}>
            <View style={styles.row}>
              <View style={styles.iconPlaceholder}>
                <Camera size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Description"
                value={description}
                onChangeText={setDescription}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.currencyBox}>
                <Text style={styles.currencyText}>$</Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  saveText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  inputSection: { padding: SPACING.lg },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  descriptionInput: { flex: 1, fontSize: 20 },
  currencyBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  currencyText: { fontSize: 24 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '600' }
});
