import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getCurrentUser } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { LayoutDashboard, Users as UsersIcon, Settings, Bell, User } from 'lucide-react-native';
import { COLORS } from '../theme/theme';

import DashboardScreen from '../screens/DashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';
import GroupsScreen from '../screens/GroupsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import InviteMemberScreen from '../screens/InviteMemberScreen';
import SettleUpScreen from '../screens/SettleUpScreen';
import ExpenseDetailScreen from '../screens/ExpenseDetailScreen';
import EditExpenseScreen from '../screens/EditExpenseScreen';
import ActivityScreen from '../screens/ActivityScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen 
        name="DashboardTab" 
        component={DashboardScreen} 
        options={{ 
          tabBarLabel: 'Friends',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="GroupsTab" 
        component={GroupsScreen} 
        options={{ 
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color, size }) => <UsersIcon color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="ActivityTab" 
        component={ActivityScreen} 
        options={{ 
          tabBarLabel: 'Activity',
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />
        }} 
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{ 
          tabBarLabel: 'Account',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />
        }} 
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkUser();
          break;
        case 'signedOut':
          setUser(null);
          break;
      }
    });
    return unsubscribe;
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen 
              name="AddExpense" 
              component={AddExpenseScreen} 
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="CreateGroup" 
              component={CreateGroupScreen} 
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="InviteMember" 
              component={InviteMemberScreen} 
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="SettleUp" 
              component={SettleUpScreen} 
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen 
              name="ExpenseDetail" 
              component={ExpenseDetailScreen} 
            />
            <Stack.Screen 
              name="EditExpense" 
              component={EditExpenseScreen} 
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
