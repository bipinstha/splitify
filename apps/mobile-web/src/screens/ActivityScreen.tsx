import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { api } from '../utils/api';
import { Bell, CreditCard, UserPlus, Trash2, PlusCircle } from 'lucide-react-native';

export default function ActivityScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await api.listActivities('user_123'); // Hardcoded
      setActivities(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchActivities();
    });
    return unsubscribe;
  }, [navigation]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'CREATE_EXPENSE': return <CreditCard size={20} color={COLORS.primary} />;
      case 'UPDATE_EXPENSE': return <PlusCircle size={20} color={COLORS.teal} />;
      case 'DELETE_EXPENSE': return <Trash2 size={20} color={COLORS.error} />;
      case 'INVITE_MEMBER': return <UserPlus size={20} color={COLORS.orange} />;
      default: return <Bell size={20} color={COLORS.textSecondary} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recent Activity</Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.activityItem}>
            <View style={styles.iconContainer}>
              {getIcon(item.type)}
            </View>
            <View style={styles.info}>
              <Text style={styles.message}>
                <Text style={styles.userName}>{item.userId}</Text> {item.message}
              </Text>
              <Text style={styles.time}>{new Date(item.timestamp).toLocaleString()}</Text>
            </View>
          </View>
        )}
        onRefresh={fetchActivities}
        refreshing={loading}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ color: COLORS.textSecondary }}>No activity yet.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  activityItem: { flexDirection: 'row', padding: SPACING.md, alignItems: 'center' },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  info: { flex: 1 },
  message: { fontSize: 15, color: COLORS.text, lineHeight: 20 },
  userName: { fontWeight: '700' },
  time: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 60 },
  empty: { alignItems: 'center', marginTop: 50 }
});
