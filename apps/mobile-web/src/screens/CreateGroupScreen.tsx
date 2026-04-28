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
import { X, Camera } from 'lucide-react-native';
import { api } from '../utils/api';

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setLoading(true);
    try {
      await api.createGroup({
        name,
        type: 'Home',
        createdBy: 'user_123', // Hardcoded
        members: ['user_123']
      });
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
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
        <Text style={styles.headerTitle}>Create a group</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator size="small" /> : <Text style={styles.saveText}>Done</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.imagePicker}>
            <Camera color={COLORS.textSecondary} size={24} />
          </TouchableOpacity>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Group name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              value={name}
              onChangeText={setName}
              autoFocus
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Group Type</Text>
        <View style={styles.typeRow}>
          {['Home', 'Trip', 'Couple', 'Other'].map((type) => (
            <TouchableOpacity key={type} style={styles.typeChip}>
              <Text style={styles.typeChipText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  imagePicker: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  inputContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  input: {
    fontSize: 18,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  typeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typeChipText: {
    color: COLORS.text,
    fontSize: 14,
  }
});
