import { 
  Utensils, 
  Home, 
  Car, 
  Zap, 
  Film, 
  ShoppingBag, 
  Briefcase, 
  MoreHorizontal,
  Smartphone,
  Plane
} from 'lucide-react-native';

export const CATEGORIES = [
  { id: 'food', name: 'Food & Drink', icon: Utensils, color: '#FF9800' },
  { id: 'rent', name: 'Rent', icon: Home, color: '#E91E63' },
  { id: 'transport', name: 'Transport', icon: Car, color: '#2196F3' },
  { id: 'utilities', name: 'Utilities', icon: Zap, color: '#FFEB3B' },
  { id: 'entertainment', name: 'Entertainment', icon: Film, color: '#9C27B0' },
  { id: 'groceries', name: 'Groceries', icon: ShoppingBag, color: '#4CAF50' },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag, color: '#795548' },
  { id: 'travel', name: 'Travel', icon: Plane, color: '#00BCD4' },
  { id: 'bills', name: 'Bills', icon: Smartphone, color: '#607D8B' },
  { id: 'other', name: 'Other', icon: MoreHorizontal, color: '#9E9E9E' },
];

export const getCategory = (id: string) => {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
};
