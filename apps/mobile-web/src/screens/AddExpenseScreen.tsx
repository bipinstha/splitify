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
import { X, Camera, ChevronRight, Users, CreditCard, Check, Image as ImageIcon, Calendar, Minus, Plus, UserPlus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../utils/api';
import { useAuth } from '../utils/auth';
import { formatCurrency } from '../utils/currency';

export default function AddExpenseScreen({ navigation }: any) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const [date, setDate] = useState(new Date());

  const [splitType, setSplitType] = useState('equal');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [equalIncludedMembers, setEqualIncludedMembers] = useState<string[]>([]);
  const [sharesMap, setSharesMap] = useState<{ [key: string]: number }>({});

  // Individual participants state (when selectedGroup is null)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [customParticipant, setCustomParticipant] = useState('');

  // Temp states for interactive modal editing
  const [tempSplitType, setTempSplitType] = useState('equal');
  const [tempEqualIncludedMembers, setTempEqualIncludedMembers] = useState<string[]>([]);
  const [tempSharesMap, setTempSharesMap] = useState<{ [key: string]: number }>({});

  // Currencies list state
  const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];
  const [currenciesList, setCurrenciesList] = useState(CURRENCIES);
  const [currency, setCurrency] = useState('USD');
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [customCurrency, setCustomCurrency] = useState('');

  useEffect(() => {
    const participants = selectedGroup 
      ? selectedGroup.members 
      : (user ? [user.userId, ...selectedParticipants] : []);
    setEqualIncludedMembers(participants);
    const initialShares: { [key: string]: number } = {};
    participants.forEach((uid: string) => {
      initialShares[uid] = 1;
    });
    setSharesMap(initialShares);
  }, [selectedGroup, user, selectedParticipants]);

  const openSplitModal = () => {
    setTempSplitType(splitType);
    setTempEqualIncludedMembers([...equalIncludedMembers]);
    setTempSharesMap({ ...sharesMap });
    setShowSplitModal(true);
  };

  const handleConfirmSplit = () => {
    setSplitType(tempSplitType);
    setEqualIncludedMembers(tempEqualIncludedMembers);
    setSharesMap(tempSharesMap);
    setShowSplitModal(false);
  };

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    try {
      const data = await api.listGroups(user.userId);
      setGroups(data);
    } catch (error) {
      console.error(error);
    }
  };

  const getFriends = () => {
    const friendSet = new Set<string>();
    groups.forEach((g: any) => {
      if (g.members) {
        g.members.forEach((m: string) => {
          if (m !== user?.userId) {
            friendSet.add(m);
          }
        });
      }
    });
    return Array.from(friendSet);
  };

  const getSelectableParticipants = () => {
    const friends = getFriends();
    const union = new Set<string>([...selectedParticipants, ...friends]);
    return Array.from(union);
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

      const parsedAmount = parseFloat(amount);
      let splits = [];
      const participants = selectedGroup 
        ? selectedGroup.members 
        : [user?.userId, ...selectedParticipants].filter(Boolean);
      
      if (splitType === 'equal') {
        const included = equalIncludedMembers.length > 0 ? equalIncludedMembers : participants;
        const perPerson = parsedAmount / included.length;
        splits = participants.map((uid: string) => ({
          userId: uid,
          owed: included.includes(uid) ? perPerson : 0
        }));
      } else if (splitType === 'shares') {
        let totalShares = 0;
        participants.forEach((uid: string) => {
          totalShares += (sharesMap[uid] || 0);
        });
        
        if (totalShares > 0) {
          const perShare = parsedAmount / totalShares;
          splits = participants.map((uid: string) => ({
            userId: uid,
            owed: perShare * (sharesMap[uid] || 0)
          }));
        } else {
          const perPerson = parsedAmount / participants.length;
          splits = participants.map((uid: string) => ({ userId: uid, owed: perPerson }));
        }
      } else {
        splits = [{ userId: user?.userId || 'anonymous', owed: parsedAmount }];
      }

      await api.createExpense({
        description,
        amount,
        date: date.toISOString(),
        groupId: selectedGroup?.id || 'non-group',
        paidBy: user?.userId || 'anonymous',
        splitType,
        splits,
        category: selectedCategory.id,
        currency,
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
              <TouchableOpacity style={styles.currencyBox} onPress={() => setShowCurrencyModal(true)}>
                <Text style={styles.currencyText}>{currency === 'USD' ? '$' : currency}</Text>
              </TouchableOpacity>
              <TextInput style={styles.amountInput} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity style={styles.optionItem} onPress={() => { setSelectedGroup(null); setShowGroupModal(true); }}>
            <Users size={20} color={COLORS.textSecondary} style={styles.optionIcon} />
            <Text style={styles.optionLabel}>{selectedGroup ? selectedGroup.name : 'Choose a group'}</Text>
            <ChevronRight size={20} color={COLORS.border} />
          </TouchableOpacity>

          {!selectedGroup && (
            <TouchableOpacity style={styles.optionItem} onPress={() => setShowParticipantsModal(true)}>
              <UserPlus size={20} color={COLORS.textSecondary} style={styles.optionIcon} />
              <Text style={styles.optionLabel} numberOfLines={1}>
                {selectedParticipants.length > 0 
                  ? `Splitting with: ${selectedParticipants.join(', ')}` 
                  : 'Add individuals to split with'}
              </Text>
              <ChevronRight size={20} color={COLORS.border} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.optionItem} onPress={() => setShowCategoryModal(true)}>
            <selectedCategory.icon size={20} color={selectedCategory.color} style={styles.optionIcon} />
            <Text style={styles.optionLabel}>{selectedCategory.name}</Text>
            <ChevronRight size={20} color={COLORS.border} />
          </TouchableOpacity>

          <View style={styles.optionItem}>
            <Calendar size={20} color={COLORS.textSecondary} style={styles.optionIcon} />
            <Text style={styles.optionLabel}>Date</Text>
            {Platform.OS === 'web' ? (
              <input 
                type="date" 
                value={date.toISOString().split('T')[0]} 
                onChange={(e) => setDate(new Date(e.target.value))}
                style={styles.dateInput as any}
              />
            ) : (
              <TouchableOpacity onPress={() => {/* On mobile we'd use a native picker */}}>
                <Text style={styles.optionLabel}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.splitSection} onPress={openSplitModal}>
            <Text style={styles.splitText}>
              Paid by <Text style={styles.boldText}>you</Text> and split{' '}
              <Text style={styles.boldText}>
                {splitType === 'equal' 
                  ? `equally (${equalIncludedMembers.length} ${equalIncludedMembers.length === 1 ? 'person' : 'people'})`
                  : `by shares (${Object.values(sharesMap).reduce((a, b) => a + b, 0).toFixed(1)} total shares)`}
              </Text>.
            </Text>
          </TouchableOpacity>
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

        {/* Participants Modal */}
        <Modal visible={showParticipantsModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowParticipantsModal(false)}>
                <X color={COLORS.text} size={24} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Split with Individuals</Text>
              <View style={{ width: 24 }} />
            </View>

            <View style={styles.customParticipantSection}>
              <TextInput
                style={styles.customParticipantInput}
                placeholder="Enter email or phone number"
                value={customParticipant}
                onChangeText={setCustomParticipant}
                keyboardType="default"
                autoCapitalize="none"
              />
              <TouchableOpacity 
                style={styles.customParticipantBtn}
                onPress={() => {
                  const val = customParticipant.trim();
                  if (!val) return;
                  if (val === user?.userId || val.toLowerCase() === user?.email?.toLowerCase()) {
                    Alert.alert('Error', 'You are already included in the split');
                    return;
                  }
                  if (selectedParticipants.includes(val)) {
                    Alert.alert('Error', 'Person already added');
                    return;
                  }
                  setSelectedParticipants(prev => [...prev, val]);
                  setCustomParticipant('');
                }}
              >
                <Text style={styles.customParticipantBtnText}>Add</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.friendListTitle}>Frequent Friends</Text>
            <FlatList
              data={getSelectableParticipants()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = selectedParticipants.includes(item);
                const toggleParticipant = () => {
                  setSelectedParticipants(prev => 
                    isSelected ? prev.filter(p => p !== item) : [...prev, item]
                  );
                };
                return (
                  <TouchableOpacity style={styles.participantItem} onPress={toggleParticipant}>
                    <View style={styles.participantLeft}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Check size={14} color="white" />}
                      </View>
                      <Text style={styles.participantName}>{item}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyFriendsText}>
                  No frequent friends found yet. Type an email or phone number above to add people.
                </Text>
              }
            />

            <TouchableOpacity 
              style={styles.confirmParticipantsBtn}
              onPress={() => setShowParticipantsModal(false)}
            >
              <Text style={styles.confirmParticipantsBtnText}>Done</Text>
            </TouchableOpacity>
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

        {/* Currency Modal */}
        <Modal visible={showCurrencyModal} animationType="slide">
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}><X color={COLORS.text} size={24} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Select Currency</Text>
              <View style={{ width: 24 }} />
            </View>
            <FlatList
              data={currenciesList}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.groupModalItem} onPress={() => { setCurrency(item); setShowCurrencyModal(false); }}>
                  <Text style={styles.groupModalName}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <View style={styles.customCurrencyRow}>
              <TextInput
                style={styles.customCurrencyInput}
                placeholder="Enter custom currency (e.g. CHF)"
                value={customCurrency}
                onChangeText={(val) => setCustomCurrency(val.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase())}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={styles.customCurrencyBtn} 
                onPress={() => {
                  if (customCurrency.length === 3) {
                    if (!currenciesList.includes(customCurrency)) {
                      setCurrenciesList(prev => [...prev, customCurrency]);
                    }
                    setCurrency(customCurrency);
                    setCustomCurrency('');
                    setShowCurrencyModal(false);
                  } else {
                    Alert.alert('Error', 'Please enter a 3-letter currency code');
                  }
                }}
              >
                <Text style={styles.customCurrencyBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>

        {/* Split Modal */}
        <Modal visible={showSplitModal} animationType="slide" transparent>
          <View style={styles.centeredModalOverlay}>
            <View style={styles.bottomSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Configure Split</Text>
                <TouchableOpacity onPress={() => setShowSplitModal(false)}><X color={COLORS.text} size={24} /></TouchableOpacity>
              </View>
              
              {/* Segmented Control */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, tempSplitType === 'equal' && styles.activeTabButton]}
                  onPress={() => setTempSplitType('equal')}
                >
                  <Text style={[styles.tabButtonText, tempSplitType === 'equal' && styles.activeTabButtonText]}>Equally</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tabButton, tempSplitType === 'shares' && styles.activeTabButton]}
                  onPress={() => setTempSplitType('shares')}
                >
                  <Text style={[styles.tabButtonText, tempSplitType === 'shares' && styles.activeTabButtonText]}>By Shares</Text>
                </TouchableOpacity>
              </View>

              {/* Scrollable list of members */}
              <ScrollView style={styles.membersList} contentContainerStyle={{ paddingBottom: 20 }}>
                {(() => {
                  const participants = selectedGroup 
                    ? selectedGroup.members 
                    : (user ? [user.userId, ...selectedParticipants] : []);
                  
                  if (tempSplitType === 'equal') {
                    const tempPerPerson = parseFloat(amount || '0') / (tempEqualIncludedMembers.length || 1);
                    return participants.map((uid: string) => {
                      const isIncluded = tempEqualIncludedMembers.includes(uid);
                      const isPayer = uid === user?.userId;
                      const displayName = isPayer ? 'You' : uid;
                      
                      const toggleMember = () => {
                        setTempEqualIncludedMembers(prev => {
                          if (prev.includes(uid)) {
                            if (prev.length <= 1) return prev; // Keep at least one selected
                            return prev.filter(id => id !== uid);
                          } else {
                            return [...prev, uid];
                          }
                        });
                      };

                      return (
                        <TouchableOpacity key={uid} style={styles.memberSplitRow} onPress={toggleMember}>
                          <View style={styles.memberLeft}>
                            <View style={[styles.checkbox, isIncluded && styles.checkboxChecked]}>
                              {isIncluded && <Check size={14} color="white" />}
                            </View>
                            <Text style={[styles.memberNameText, !isIncluded && styles.disabledText]}>{displayName}</Text>
                          </View>
                          <Text style={[styles.memberAmountText, !isIncluded && styles.disabledText]}>
                            {formatCurrency(isIncluded ? tempPerPerson : 0, currency)}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  } else {
                    let totalTempShares = 0;
                    participants.forEach((uid: string) => {
                      totalTempShares += (tempSharesMap[uid] || 0);
                    });
                    const tempPerShare = totalTempShares > 0 ? parseFloat(amount || '0') / totalTempShares : 0;
                    
                    return participants.map((uid: string) => {
                      const isPayer = uid === user?.userId;
                      const displayName = isPayer ? 'You' : uid;
                      const shares = tempSharesMap[uid] || 0;
                      const userOwed = shares * tempPerShare;

                      const adjustShares = (delta: number) => {
                        setTempSharesMap(prev => {
                          const current = prev[uid] || 0;
                          const updated = Math.max(0, current + delta);
                          return { ...prev, [uid]: updated };
                        });
                      };

                      return (
                        <View key={uid} style={styles.memberSplitRow}>
                          <View style={styles.memberLeft}>
                            <Text style={styles.memberNameText}>{displayName}</Text>
                          </View>
                          <View style={styles.sharesControlsRow}>
                            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustShares(-1)}>
                              <Minus size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                            <TextInput
                              keyboardType="numeric"
                              style={styles.sharesInput}
                              value={shares.toString()}
                              onChangeText={(val) => {
                                const cleaned = val.replace(/[^0-9.]/g, '');
                                const parsed = parseFloat(cleaned) || 0;
                                setTempSharesMap(prev => ({ ...prev, [uid]: parsed }));
                              }}
                            />
                            <TouchableOpacity style={styles.controlBtn} onPress={() => adjustShares(1)}>
                              <Plus size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                            <Text style={styles.memberAmountText}>
                              {formatCurrency(userOwed, currency)}
                            </Text>
                          </View>
                        </View>
                      );
                    });
                  }
                })()}
              </ScrollView>

              {/* Confirm split button */}
              <TouchableOpacity style={styles.confirmSplitButton} onPress={handleConfirmSplit}>
                <Text style={styles.confirmSplitButtonText}>Confirm Split Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  currencyBox: { width: 60, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md, backgroundColor: COLORS.surface, borderRadius: 8 },
  currencyText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
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
  groupModalName: { fontSize: 16 },
  dateInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'inherit',
    textAlign: 'right'
  },
  centeredModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  bottomSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: '80%'
  },
  tabContainer: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6
  },
  activeTabButton: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: '700'
  },
  membersList: {
    maxHeight: 300,
    paddingHorizontal: SPACING.md
  },
  memberSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  memberNameText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500'
  },
  disabledText: {
    color: COLORS.textSecondary,
    textDecorationLine: 'line-through'
  },
  memberAmountText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'right'
  },
  sharesControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 2
  },
  controlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface
  },
  confirmSplitButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.md,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md
  },
  confirmSplitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700'
  },
  customParticipantSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  customParticipantInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.md,
    fontSize: 16,
  },
  customParticipantBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 8,
  },
  customParticipantBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  friendListTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  participantItem: {
    padding: SPACING.md,
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
    marginLeft: SPACING.md,
  },
  emptyFriendsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    margin: SPACING.xl,
  },
  confirmParticipantsBtn: {
    backgroundColor: COLORS.primary,
    margin: SPACING.md,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmParticipantsBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  customCurrencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  customCurrencyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.md,
    fontSize: 16,
    backgroundColor: 'white',
  },
  customCurrencyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderRadius: 8,
  },
  customCurrencyBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  sharesInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.text,
    marginHorizontal: SPACING.xs,
    backgroundColor: COLORS.surface
  },
});
