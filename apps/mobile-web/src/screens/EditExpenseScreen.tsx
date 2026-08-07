import React, { useState, useEffect } from 'react';
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
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, Camera, ChevronRight } from 'lucide-react-native';
import { api } from '../utils/api';
import { getCurrencySymbol } from '../utils/currency';
import { useAuth } from '../utils/auth';

export default function EditExpenseScreen({ route, navigation }: any) {
  const { expense } = route.params;
  const { user } = useAuth();
  
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [saving, setSaving] = useState(false);

  // Group & Individual Selection State
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Fetch groups list
  useEffect(() => {
    if (user) {
      api.listGroups(user.userId)
        .then((data) => {
          setGroups(data);
          if (expense.groupId && expense.groupId !== 'non-group') {
            const grp = data.find((g: any) => g.id === expense.groupId);
            if (grp) setSelectedGroup(grp);
          }
        })
        .catch(console.error);
    }
  }, [user, expense.groupId]);

  // Load initial participants for non-group splits
  useEffect(() => {
    if (expense.groupId === 'non-group' && expense.splits && user) {
      const others = expense.splits
        .map((s: any) => s.userId)
        .filter((id: string) => id !== user.userId && id !== expense.paidBy);
      setSelectedParticipants(others);
    }
  }, [expense, user]);

  // Helper getters for participants
  const getFriends = () => {
    const friends = new Set<string>();
    groups.forEach((g) => {
      g.members.forEach((m: string) => {
        if (m !== user?.userId) friends.add(m);
      });
    });
    return Array.from(friends);
  };

  const getSelectableParticipants = () => {
    const list = new Set<string>([...selectedParticipants, ...getFriends()]);
    return Array.from(list);
  };

  const handleUpdate = async () => {
    if (!description || !amount) {
      Alert.alert('Error', 'Please enter a description and amount');
      return;
    }

    const parsedAmount = parseFloat(amount);
    let updatedSplits = [];

    // Determine current members we are splitting with
    const currentSplitMembers = selectedGroup 
      ? selectedGroup.members 
      : [user?.userId, ...selectedParticipants].filter(Boolean);

    // Check if the group and participants are completely unchanged
    const originalMembers = expense.splits?.map((s: any) => s.userId) || [];
    const isUnchanged = expense.groupId === (selectedGroup?.id || 'non-group') &&
      originalMembers.length === currentSplitMembers.length &&
      originalMembers.every((m: string) => currentSplitMembers.includes(m));

    if (isUnchanged && expense.splits && expense.splits.length > 0) {
      // Recalculate using original splits ratio/types
      if (expense.splitType === 'equal') {
        const includedMembers = expense.splits.filter((s: any) => s.owed > 0);
        const numIncluded = includedMembers.length || expense.splits.length || 1;
        const perPerson = parsedAmount / numIncluded;
        
        updatedSplits = expense.splits.map((s: any) => ({
          userId: s.userId,
          owed: s.owed > 0 ? perPerson : 0
        }));
      } else if (expense.splitType === 'shares') {
        const oldAmount = expense.amount || 1;
        const ratio = parsedAmount / oldAmount;
        updatedSplits = expense.splits.map((s: any) => ({
          userId: s.userId,
          owed: s.owed * ratio
        }));
      } else {
        const perPerson = parsedAmount / expense.splits.length;
        updatedSplits = expense.splits.map((s: any) => ({
          userId: s.userId,
          owed: perPerson
        }));
      }
    } else {
      // Group or participants changed: split equally among new members
      const perPerson = parsedAmount / currentSplitMembers.length;
      updatedSplits = currentSplitMembers.map((m: string) => ({
        userId: m,
        owed: perPerson
      }));
    }

    setSaving(true);
    try {
      await api.updateExpense({
        id: expense.id,
        originalGroupId: expense.groupId || 'non-group',
        groupId: selectedGroup?.id || 'non-group',
        description,
        amount,
        splits: updatedSplits,
      });
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
                <Text 
                  style={styles.currencyText}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {getCurrencySymbol(expense.currency)}
                </Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>

            {/* Split Target Group Selection */}
            <TouchableOpacity style={styles.optionRow} onPress={() => setShowGroupModal(true)}>
              <Text style={styles.optionLabel}>
                Group: {selectedGroup ? selectedGroup.name : 'No Group (Individual)'}
              </Text>
              <ChevronRight color={COLORS.textSecondary} size={20} />
            </TouchableOpacity>

            {/* Split Target Individuals Selection (if non-group) */}
            {!selectedGroup && (
              <TouchableOpacity style={styles.optionRow} onPress={() => setShowParticipantsModal(true)}>
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {selectedParticipants.length > 0
                    ? `Splitting with: ${selectedParticipants.join(', ')}`
                    : 'Split with: Me only'}
                </Text>
                <ChevronRight color={COLORS.textSecondary} size={20} />
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Group Selector Modal */}
      <Modal visible={showGroupModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowGroupModal(false)}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Choose Group</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={[{ id: 'non-group', name: 'No Group (Individual)' }, ...groups]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.groupItem}
                onPress={() => {
                  setSelectedGroup(item.id === 'non-group' ? null : item);
                  setShowGroupModal(false);
                }}
              >
                <Text style={styles.groupItemText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Participants Selector Modal */}
      <Modal visible={showParticipantsModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Split with Individuals</Text>
            <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
              <Text style={styles.saveText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addIndividualInputContainer}>
            <TextInput
              style={styles.addIndividualInput}
              placeholder="Enter email or phone number"
              value={customInput}
              onChangeText={setCustomInput}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity
              style={styles.addIndividualButton}
              onPress={() => {
                if (customInput.trim()) {
                  const cleanVal = customInput.trim();
                  setSelectedParticipants((prev) => {
                    if (!prev.includes(cleanVal)) {
                      return [...prev, cleanVal];
                    }
                    return prev;
                  });
                  setCustomInput('');
                }
              }}
            >
              <Text style={styles.addIndividualButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.friendListTitle}>Frequent Friends</Text>
          <FlatList
            data={getSelectableParticipants()}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected = selectedParticipants.includes(item);
              const toggleParticipant = () => {
                setSelectedParticipants((prev) =>
                  isSelected ? prev.filter((p) => p !== item) : [...prev, item]
                );
              };
              return (
                <TouchableOpacity style={styles.participantItem} onPress={toggleParticipant}>
                  <View style={styles.participantLeft}>
                    <Text style={styles.participantName}>{item}</Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
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
    backgroundColor: 'white',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
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
    backgroundColor: 'white',
  },
  descriptionInput: { flex: 1, fontSize: 20, color: COLORS.text },
  currencyBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  currencyText: { fontSize: 24, fontWeight: '600', color: COLORS.text },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '600', color: COLORS.text },
  
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  optionLabel: { fontSize: 16, color: COLORS.text, flex: 1 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'white',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  groupItem: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'white',
  },
  groupItemText: { fontSize: 16, color: COLORS.text },

  addIndividualInputContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  addIndividualInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    marginRight: SPACING.md,
    color: COLORS.text,
  },
  addIndividualButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addIndividualButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  friendListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  participantItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  participantLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    color: COLORS.text,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxCheck: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
