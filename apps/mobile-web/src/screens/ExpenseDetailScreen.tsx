import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  ScrollView,
  Alert,
  Image as RNImage,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, Calendar, CreditCard, User, Trash2, Send } from 'lucide-react-native';
import { api } from '../utils/api';
import { useAuth } from '../utils/auth';
import { formatCurrency } from '../utils/currency';

export default function ExpenseDetailScreen({ route, navigation }: any) {
  const { expense } = route.params;
  const { user } = useAuth();
  const imageUrl = expense.attachmentKey 
    ? `https://splitify-data-832439451819.s3.us-east-1.amazonaws.com/${expense.attachmentKey}`
    : null;

  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [posting, setPosting] = useState(false);
  const [userNames, setUserNames] = useState<{ [userId: string]: string }>({});

  useEffect(() => {
    const resolveNames = async () => {
      const ids = new Set<string>();
      if (expense.paidBy) ids.add(expense.paidBy);
      if (expense.splits) {
        expense.splits.forEach((s: any) => {
          if (s.userId) ids.add(s.userId);
        });
      }

      const namesMap: { [userId: string]: string } = {};

      if (user) {
        namesMap[user.userId] = 'You';
      }

      for (const id of Array.from(ids)) {
        if (user && id === user.userId) {
          continue;
        }

        if (id.includes('@') || id.startsWith('+') || id.length < 20) {
          namesMap[id] = id;
          continue;
        }

        try {
          const profile = await api.getUserProfile(id);
          namesMap[id] = profile.email || profile.phone || id;
        } catch (err) {
          namesMap[id] = id;
        }
      }

      setUserNames(namesMap);
    };

    resolveNames();
  }, [expense, user]);

  const getUserDisplayName = (id: string) => {
    return userNames[id] || id;
  };

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      const data = await api.listComments(expense.id);
      setComments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const newComment = await api.addComment(expense.id, commentText);
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (e) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

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

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.content}>
          <View style={styles.mainInfo}>
            <View style={styles.categoryIcon}>
              <CreditCard size={30} color={COLORS.primary} />
            </View>
            <Text style={styles.description}>{expense.description}</Text>
            <Text style={styles.amount}>{formatCurrency(expense.amount, expense.currency)}</Text>
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
                <Text style={styles.bold}>{getUserDisplayName(expense.paidBy)}</Text> paid <Text style={styles.bold}>{formatCurrency(expense.amount, expense.currency)}</Text>
              </Text>
            </View>

            {expense.splits?.map((split: any, index: number) => {
              const isCurrentUser = user && (
                split.userId === user.userId ||
                (user.email && split.userId === user.email) ||
                (user.username && split.userId === user.username)
              );
              const displayName = getUserDisplayName(split.userId);
              return (
                <View key={index} style={styles.splitRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.splitText}>
                    <Text style={styles.bold}>{displayName}</Text> {isCurrentUser ? 'owe' : 'owes'} <Text style={styles.bold}>{formatCurrency(split.owed, expense.currency)}</Text>
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Comments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Comments</Text>
            {loadingComments ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : comments.length === 0 ? (
              <Text style={styles.emptyComments}>No comments yet. Be the first!</Text>
            ) : (
              comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Text style={styles.avatarText}>{c.userId.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.commentBody}>
                    <Text style={styles.commentUser}>{c.userId}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                    <Text style={styles.commentTime}>{new Date(c.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
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

        {/* Comment input */}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            placeholderTextColor={COLORS.textSecondary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity onPress={handleAddComment} disabled={posting || !commentText.trim()} style={styles.sendButton}>
            {posting ? <ActivityIndicator size="small" color="white" /> : <Send size={18} color="white" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  },
  emptyComments: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  commentBody: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  commentUser: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
  },
  commentTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: 'white',
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.text,
    maxHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
});
