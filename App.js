import 'react-native-url-polyfill/auto';
import React from 'react';
import { useFonts, Pacifico_400Regular } from '@expo-google-fonts/pacifico'; 
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  let [fontsLoaded] = useFonts({
    Pacifico: Pacifico_400Regular,
  });

  // Prevents the app from crashing while the font loads in the background.
  // Returning null just shows nothing for a split second (no spinners!).
  if (!fontsLoaded) {
    return null;
  }

  return <AppNavigator />;
}