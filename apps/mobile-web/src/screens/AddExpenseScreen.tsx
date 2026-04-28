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
  FlatList,
  Image as RNImage
} from 'react-native';
import { COLORS, SPACING } from '../theme/theme';
import { CATEGORIES, getCategory } from '../theme/categories';
import { X, Camera, ChevronRight, Users, CreditCard, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../utils/api';

export default function AddExpenseScreen({ navigation }: any) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await api.listGroups('user_123');
      setGroups(data);
    } catch (error) {
      console.error(error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!description || !amount) {
      Alert.alert('Error', 'Please enter a description and amount');
      return;
    }

    setSaving(true);
    try {
      let attachmentKey = null;
      if (image) {
        const { uploadUrl, key } = await api.getUploadUrl(`receipt_${Date.now()}.jpg`, 'image/jpeg');
        await api.uploadFile(uploadUrl, image, 'image/jpeg');
        attachmentKey = key;
      }

      await api.createExpense({
        description,
        amount,
        groupId: selectedGroup?.id || 'non-group',
        paidBy: 'user_123',
        splitType: 'equal',
        category: selectedCategory.id,
        attachmentKey,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={saving}><X color={COLORS.text} size={24} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Add expense</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.saveText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.inputSection}>
            <View style={styles.row}>
              <TouchableOpacity style={styles.iconPlaceholder} onPress={pickImage}>
                {image ? <RNImage source={{ uri: image }} style={styles.previewImage} /> : <Camera size={20} color={COLORS.textSecondary} />}
              </TouchableOpacity>
              <TextInput style={styles.descriptionInput} placeholder="Enter a description" value={description} onChangeText={setDescription} />
            </View>
            <View style={styles.row}>
              <View style={styles.currencyBox}><Text style={styles.currencyText}>$</Text></View>
              <TextInput style={styles.amountInput} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.optionItem} onPress={() => setShowGroupModal(true)}>
            <Users size={20} color={COLORS.textSecondary} style={styles.optionIcon} />
            <Text style={styles.optionLabel}>{selectedGroup ? selectedGroup.name : 'Choose a group'}</Text>
            <ChevronRight size={20} color={COLORS.border} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={() => setShowCategoryModal(true)}>
            <selectedCategory.icon size={20} color={selectedCategory.color} style={styles.optionIcon} />
            <Text style={styles.optionLabel}>{selectedCategory.name}</Text>
            <ChevronRight size={20} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.splitSection}>
            <Text style={styles.splitText}>Paid by <Text style={styles.boldText}>you</Text> and split <Text style={styles.boldText}>equally</Text>.</Text>
          </View>
        </ScrollView>

        {/* Group Modal */}
        <Modal visible={showGroupModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}><X color={COLORS.text} size={24} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Select Group</Text>
              <View style={{ width: 24 }} />
            </View>
            <FlatList
              data={[{ id: 'non-group', name: 'No Group' }, ...groups]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.groupModalItem} onPress={() => { setSelectedGroup(item.id === 'non-group' ? null : item); setShowGroupModal(false); }}>
                  <Text style={styles.groupModalName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>

        {/* Category Modal */}
        <Modal visible={showCategoryModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}><X color={COLORS.text} size={24} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Select Category</Text>
              <View style={{ width: 24 }} />
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.groupModalItem} onPress={() => { setSelectedCategory(item); setShowCategoryModal(false); }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <item.icon size={20} color={item.color} style={{ marginRight: 15 }} />
                    <Text style={styles.groupModalName}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  saveText: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  inputSection: { padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  iconPlaceholder: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%' },
  descriptionInput: { flex: 1, fontSize: 20 },
  currencyBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  currencyText: { fontSize: 24 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '600' },
  optionItem: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  optionIcon: { marginRight: SPACING.md },
  optionLabel: { flex: 1, fontSize: 16 },
  splitSection: { padding: SPACING.lg, alignItems: 'center', backgroundColor: COLORS.surface },
  splitText: { fontSize: 16, color: COLORS.textSecondary },
  boldText: { fontWeight: '700', color: COLORS.primary },
  modalContainer: { flex: 1, backgroundColor: 'white' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  groupModalItem: { padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  groupModalName: { fontSize: 16 }
});
