import React from 'react';
import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

import { colors } from '../constants/theme';
import { FeedScreen } from '../screens/FeedScreen';
import { GoalsScreen } from '../screens/GoalsScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

export type GroupsStackParamList = {
  GroupsHome: undefined;
  GroupDetail: { groupId: string };
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  GroupDetail: { groupId: string };
};

export type MainTabParamList = {
  Feed: undefined;
  Groups: NavigatorScreenParams<GroupsStackParamList>;
  Goals: undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const GroupsStack = createNativeStackNavigator<GroupsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const TAB_ICONS = {
  Feed: 'home',
  Groups: 'users',
  Goals: 'target',
  Profile: 'user',
} as const;

function GroupsStackNavigator() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsHome">
        {({ navigation }) => (
          <GroupsScreen
            onOpenGroup={(groupId) =>
              navigation.navigate('GroupDetail', { groupId })
            }
          />
        )}
      </GroupsStack.Screen>
      <GroupsStack.Screen name="GroupDetail">
        {({
          route,
          navigation,
        }: NativeStackScreenProps<GroupsStackParamList, 'GroupDetail'>) => (
          <GroupDetailScreen
            groupId={route.params.groupId}
            onBack={() => navigation.goBack()}
          />
        )}
      </GroupsStack.Screen>
    </GroupsStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileHome">
        {({ navigation }) => (
          <ProfileScreen
            onOpenGroup={(groupId) =>
              navigation.navigate('GroupDetail', { groupId })
            }
          />
        )}
      </ProfileStack.Screen>
      <ProfileStack.Screen name="GroupDetail">
        {({
          route,
          navigation,
        }: NativeStackScreenProps<ProfileStackParamList, 'GroupDetail'>) => (
          <GroupDetailScreen
            groupId={route.params.groupId}
            onBack={() => navigation.goBack()}
          />
        )}
      </ProfileStack.Screen>
    </ProfileStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => (
          <Feather
            name={TAB_ICONS[route.name as keyof typeof TAB_ICONS]}
            size={size}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen
        name="Groups"
        component={GroupsStackNavigator}
        options={{ title: 'Groups' }}
      />
      <Tab.Screen name="Goals" component={GoalsScreen} />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNavigator}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

export default AppNavigator;
