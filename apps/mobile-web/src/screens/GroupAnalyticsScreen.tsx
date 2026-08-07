import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { ChevronLeft, BarChart2, PieChart, TrendingUp, Users, Settings, X } from 'lucide-react-native';
import { api } from '../utils/api';
import { getCategory } from '../theme/categories';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function GroupAnalyticsScreen({ route, navigation }: any) {
  const { groupId, groupName, groupType } = route.params;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [currentGroupName, setCurrentGroupName] = useState(groupName);
  const [currentGroupType, setCurrentGroupType] = useState(groupType || 'Other');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(groupName);
  const [editType, setEditType] = useState(groupType || 'Other');
  const [updating, setUpdating] = useState(false);

  const handleShowSettings = () => {
    Alert.alert(
      'Group Settings',
      'What would you like to do?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit Group Name/Type', onPress: () => setShowEditModal(true) },
        { text: 'Delete Group', style: 'destructive', onPress: handleDeleteGroup }
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setUpdating(true);
    try {
      await api.updateGroup(groupId, { name: editName.trim(), type: editType });
      setCurrentGroupName(editName.trim());
      setCurrentGroupType(editType);
      Alert.alert('Success', 'Group updated successfully', [
        { text: 'OK', onPress: () => { setShowEditModal(false); } }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to update group');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? All associated expenses will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await api.deleteGroup(groupId);
              Alert.alert('Success', 'Group deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Failed to delete group');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    fetchAnalytics();
  }, [groupId]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const analytics = await api.getGroupAnalytics(groupId);
      setData(analytics);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const categoryEntries = Object.entries(data?.categoryBreakdown || {}).sort((a: any, b: any) => b[1] - a[1]);
  const userEntries = Object.entries(data?.userBreakdown || {}).sort((a: any, b: any) => b[1] - a[1]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ChevronLeft color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentGroupName} Analytics</Text>
        <TouchableOpacity onPress={handleShowSettings}>
          <Settings color={COLORS.text} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Group Spending</Text>
          <Text style={styles.totalAmount}>${data?.totalSpending?.toFixed(2)}</Text>
          <Text style={styles.expenseCount}>{data?.expenseCount} total expenses</Text>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <PieChart size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>By Category</Text>
          </View>
          
          {categoryEntries.length > 0 ? (
            categoryEntries.map(([cat, amount]: any) => {
              const categoryInfo = getCategory(cat);
              const percentage = (amount / data.totalSpending) * 100;
              return (
                <View key={cat} style={styles.breakdownItem}>
                  <View style={styles.itemTop}>
                    <View style={styles.itemLabelRow}>
                      <View style={[styles.miniIcon, { backgroundColor: categoryInfo.color + '22' }]}>
                        <categoryInfo.icon size={12} color={categoryInfo.color} />
                      </View>
                      <Text style={styles.itemName}>{cat}</Text>
                    </View>
                    <Text style={styles.itemAmount}>${amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: categoryInfo.color }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noData}>No category data available</Text>
          )}
        </View>

        {/* User Contribution */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Paid By</Text>
          </View>
          
          {userEntries.length > 0 ? (
            userEntries.map(([user, amount]: any) => {
              const percentage = (amount / data.totalSpending) * 100;
              return (
                <View key={user} style={styles.breakdownItem}>
                  <View style={styles.itemTop}>
                    <Text style={styles.itemName}>{user}</Text>
                    <Text style={styles.itemAmount}>${amount.toFixed(2)}</Text>
                  </View>
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${percentage}%`, backgroundColor: COLORS.primary }]} />
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noData}>No user data available</Text>
          )}
        </View>

        {/* Monthly Trend (Simplified) */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Monthly Trend</Text>
          </View>
          
          <View style={styles.trendContainer}>
            {Object.entries(data?.monthlySpending || {}).map(([month, amount]: any) => (
              <View key={month} style={styles.trendBarContainer}>
                <View 
                  style={[
                    styles.trendBar, 
                    { height: Math.max((amount / data.totalSpending) * 100, 10) }
                  ]} 
                />
                <Text style={styles.trendLabel}>{month.split('-')[1]}/{month.split('-')[0].slice(2)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Edit Group Modal */}
      <Modal visible={showEditModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)} disabled={updating}>
              <X color={COLORS.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Group</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={updating}>
              {updating ? <ActivityIndicator size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Group Name"
                value={editName}
                onChangeText={setEditName}
                autoFocus
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Group Type</Text>
              <View style={styles.typeButtonsRow}>
                {['Home', 'Trip', 'Couple', 'Other'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeButton, editType === t && styles.activeTypeButton]}
                    onPress={() => setEditType(t)}
                  >
                    <Text style={[styles.typeButtonText, editType === t && styles.activeTypeButtonText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  content: { flex: 1, padding: SPACING.md },
  summaryCard: {
    backgroundColor: COLORS.primary,
    padding: SPACING.xl,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  totalAmount: { color: 'white', fontSize: 36, fontWeight: '800', marginVertical: 8 },
  expenseCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
  section: { backgroundColor: 'white', borderRadius: 12, padding: SPACING.md, marginBottom: SPACING.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginLeft: 8 },
  breakdownItem: { marginBottom: SPACING.md },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemLabelRow: { flexDirection: 'row', alignItems: 'center' },
  miniIcon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  itemAmount: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  progressBarContainer: { height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  noData: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 20 },
  trendContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 150, paddingTop: 20 },
  trendBarContainer: { alignItems: 'center', width: 40 },
  trendBar: { width: 20, backgroundColor: COLORS.primary, borderRadius: 4 },
  trendLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 8 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  saveText: { fontSize: 16, fontWeight: '600', color: COLORS.primary },
  modalContent: { flex: 1, padding: SPACING.md },
  inputContainer: { marginBottom: SPACING.lg },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  typeButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  activeTypeButton: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeButtonText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  activeTypeButtonText: { color: 'white' }
});
