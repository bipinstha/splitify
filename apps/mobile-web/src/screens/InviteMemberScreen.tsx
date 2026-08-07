import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  SafeAreaView, 
  Alert,
  ActivityIndicator
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { X, UserPlus } from 'lucide-react-native';
import { api } from '../utils/api';

export default function InviteMemberScreen({ route, navigation }: any) {
  const { groupId, groupName } = route.params;
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    const input = emailOrPhone.trim();
    if (!input) {
      Alert.alert('Error', 'Please enter an email address or phone number');
      return;
    }

    const isEmail = input.includes('@');
    const cleanedPhone = input.replace(/[^0-9+]/g, '');
    const isPhone = cleanedPhone.length >= 7 && (cleanedPhone.startsWith('+') || /^\d+$/.test(cleanedPhone));

    if (!isEmail && !isPhone) {
      Alert.alert('Error', 'Please enter a valid email address or phone number (e.g. +1234567890)');
      return;
    }

    const inviteValue = isEmail ? input.toLowerCase() : cleanedPhone;

    setLoading(true);
    try {
      await api.inviteMember(groupId, inviteValue);
      Alert.alert('Success', `"${inviteValue}" has been added to ${groupName}`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to invite member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={loading}>
          <X color={COLORS.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add to {groupName}</Text>
        <TouchableOpacity onPress={handleInvite} disabled={loading}>
          {loading ? <ActivityIndicator size="small" /> : <Text style={styles.saveText}>Add</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <UserPlus color={COLORS.textSecondary} size={20} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Email address or phone number"
            value={emailOrPhone}
            onChangeText={setEmailOrPhone}
            keyboardType="default"
            autoCapitalize="none"
            autoFocus
          />
        </View>
        <Text style={styles.helperText}>
          Entering an email address or phone number (e.g. +1234567890) will instantly add this person to your group.
        </Text>
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
    padding: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: SPACING.sm,
  },
  icon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
  },
  helperText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    lineHeight: 20,
  }
});
