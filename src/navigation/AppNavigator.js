import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../hooks/useSession';
import LoginScreen from '../screens/LoginScreen';
import StudentDashboard from '../screens/StudentDashboard';
import InstructorDashboard from '../screens/InstructorDashboard';
import QRScannerScreen from '../screens/QRScannerScreen';
import SessionControlScreen from '../screens/SessionControlScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { session, profile, loading } = useSession();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : profile?.role === 'instructor' || profile?.role === 'admin' ? (
          <>
            <Stack.Screen name="InstructorDashboard">
              {(props) => <InstructorDashboard {...props} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen
              name="SessionControl"
              component={SessionControlScreen}
              options={{ headerShown: true, title: 'Session Control', headerBackTitle: 'Back' }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="StudentDashboard">
              {(props) => <StudentDashboard {...props} profile={profile} />}
            </Stack.Screen>
            <Stack.Screen
              name="QRScanner"
              component={QRScannerScreen}
              options={{ headerShown: true, title: 'Scan QR Code', headerBackTitle: 'Back' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}