import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';

const ToastComponent = Toast as unknown as React.ComponentType<any>;

// Toast configuration - auto hide after 1 second
const toastConfig = {
  visibilityTime: 1000, // 1 second
  autoHide: true,
  topOffset: 60,
  bottomOffset: 40,
};

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Main Navigator
import MainNavigator from './MainNavigator';

const Stack = createNativeStackNavigator();

function ProfileLoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}

/**
 * AppNavigator Component
 * Root navigation with authentication flow
 */
export default function AppNavigator() {
  const { firebaseUser, user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff'
      }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {firebaseUser ? (
            user ? (
              <Stack.Screen name="Main" component={MainNavigator} />
            ) : (
              <Stack.Screen
                name="ProfileLoading"
                component={ProfileLoadingScreen}
              />
            )
          ) : (
            <Stack.Group>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
            </Stack.Group>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      <ToastComponent config={toastConfig} />
    </>
  );
}