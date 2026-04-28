import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  Image as RNImage
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, Calendar, CreditCard, User, Trash2 } from 'lucide-react-native';
import { api } from '../utils/api';

export default function ExpenseDetailScreen({ route, navigation }: any) {
  const { expense } = route.params;
  const imageUrl = expense.attachmentKey 
    ? `https://splitify-data-832439451819.s3.us-east-1.amazonaws.com/${expense.attachmentKey}`
    : null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteExpense(expense.id, expense.groupId);
              navigation.goBack();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Details</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Trash2 color={COLORS.error} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.mainInfo}>
          <View style={styles.categoryIcon}>
            <CreditCard size={30} color={COLORS.primary} />
          </View>
          <Text style={styles.description}>{expense.description}</Text>
          <Text style={styles.amount}>${expense.amount.toFixed(2)}</Text>
          <Text style={styles.date}>
            Added on {new Date(expense.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {imageUrl && (
          <View style={styles.imageSection}>
            <Text style={styles.sectionTitle}>Receipt Attachment</Text>
            <RNImage source={{ uri: imageUrl }} style={styles.receiptImage} resizeMode="contain" />
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Split Breakdown</Text>
          <View style={styles.splitRow}>
            <View style={styles.payerAvatar}>
              <User size={16} color="white" />
            </View>
            <Text style={styles.splitText}>
              <Text style={styles.bold}>{expense.paidBy}</Text> paid <Text style={styles.bold}>${expense.amount.toFixed(2)}</Text>
            </Text>
          </View>

          {expense.splits?.map((split: any, index: number) => (
            <View key={index} style={styles.splitRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.avatarText}>{split.userId.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.splitText}>
                <Text style={styles.bold}>{split.userId}</Text> owes <Text style={styles.bold}>${split.owed.toFixed(2)}</Text>
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => navigation.navigate('EditExpense', { expense })}
          >
            <Text style={styles.editButtonText}>Edit expense</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  },
  content: {
    flex: 1,
  },
  mainInfo: {
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  date: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  section: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  imageSection: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  payerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  splitText: {
    fontSize: 16,
    color: COLORS.text,
  },
  bold: {
    fontWeight: '700',
  },
  footer: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  editButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  }
});
