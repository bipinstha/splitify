import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  SafeAreaView, 
  Alert,
  ActivityIndicator,
  TextInput
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { fetchUserAttributes, signOut, updateUserAttribute } from 'aws-amplify/auth';
import { User, LogOut, Mail, Edit2, Check, X } from 'lucide-react-native';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const attributes = await fetchUserAttributes();
      setUser(attributes);
      setNewName(attributes.name || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!newName) return;
    setUpdating(true);
    try {
      await updateUserAttribute({
        userAttribute: {
          attributeKey: 'name',
          value: newName
        }
      });
      setUser({ ...user, name: newName });
      setIsEditing(false);
      Alert.alert('Success', 'Name updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update name');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error(error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <User size={40} color={COLORS.primary} />
          </View>
          
          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput 
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                autoFocus
              />
              <TouchableOpacity onPress={handleUpdateName} disabled={updating}>
                {updating ? <ActivityIndicator size="small" /> : <Check color={COLORS.success} size={24} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={{ marginLeft: 10 }}>
                <X color={COLORS.error} size={24} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user?.name || 'No Name Set'}</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Edit2 size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          )}
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Settings List */}
        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <Mail size={20} color={COLORS.textSecondary} />
            <Text style={styles.settingLabel}>Email Verification</Text>
            <Text style={styles.settingValue}>Verified</Text>
          </View>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <LogOut size={20} color={COLORS.error} />
            <Text style={[styles.settingLabel, { color: COLORS.error }]}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.version}>Splitify v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: { backgroundColor: 'white', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: SPACING.md },
  profileCard: { backgroundColor: 'white', padding: SPACING.xl, borderRadius: 12, alignItems: 'center', marginBottom: SPACING.lg },
  avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  userName: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  editRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  nameInput: { fontSize: 20, fontWeight: '700', borderBottomWidth: 1, borderBottomColor: COLORS.primary, marginRight: 10, flex: 1, textAlign: 'center' },
  userEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  settingsList: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  settingLabel: { flex: 1, fontSize: 16, marginLeft: SPACING.md, color: COLORS.text },
  settingValue: { fontSize: 14, color: COLORS.success, fontWeight: '600' },
  footer: { marginTop: SPACING.xl, alignItems: 'center' },
  version: { fontSize: 12, color: COLORS.textSecondary }
});
