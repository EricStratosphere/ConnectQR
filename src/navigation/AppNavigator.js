import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

// === ORIGINAL CODE (UNCOMMENT LATER) ===
// import { useSession } from '../hooks/useSession';
// =======================================

// 1. Import your new auth screens here
import LandingScreen from '../screens/LoadingScreen'; // Pointing to your new LoadingScreen.js
import SignUpScreen from '../screens/SignUpScreen';   // Make sure you have this file from the earlier step!
import LoginScreen from '../screens/LoginScreen';

// Dashboard imports
import StudentDashboard from '../screens/StudentDashboard';
import InstructorDashboard from '../screens/InstructorDashboard';
import QRScannerScreen from '../screens/QRScannerScreen';
import SessionControlScreen from '../screens/SessionControlScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  
  // === ORIGINAL CODE (UNCOMMENT LATER) ===
  // const { session, profile, loading } = useSession();
  // =======================================

  // === TEMPORARY TESTING CODE (DELETE LATER) ===
  const loading = false;
  const session = false; // <-- Keeps us logged out so we see the Landing screen
  const profile = null; 
  // =============================================

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
          // 2. Add the Landing and SignUp screens here. 
          // Because "Landing" is first, it will show up immediately when the app opens!
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
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