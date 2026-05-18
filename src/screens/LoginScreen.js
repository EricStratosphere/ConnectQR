import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, Image, ScrollView, Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signIn } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const navigation = useNavigation();

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await signIn(email.trim(), password);
      if (response && response.error) {
        throw response.error;
      }
    } catch (err) {
      Alert.alert('Login Failed', err.message ?? 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          
          {!isKeyboardVisible && (
            <View style={styles.topSection}>
              <Image source={require('../../assets/cody.png')} style={styles.logoImage} />
            </View>
          )}

          <View style={[styles.bottomSheet, isKeyboardVisible && { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 60 }]}>
            <Text style={styles.title}>Log In</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput style={styles.passwordInput} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Log In</Text>}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0eff4' },
  container: { flex: 1 },
  topSection: { height: 240, paddingHorizontal: 32, paddingTop: 40, justifyContent: 'flex-end' },
  logoImage: { width: 100, height: 100, marginBottom: 0 },
  bottomSheet: {
    flex: 1, backgroundColor: '#ffffff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 32, paddingTop: 40, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', color: '#1c625c', marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 20, paddingVertical: 14, paddingHorizontal: 20, fontSize: 15, color: '#1e293b', backgroundColor: '#ffffff',
  },
  btn: { backgroundColor: '#1c625c', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 20, backgroundColor: '#ffffff' },
  passwordInput: { flex: 1, paddingVertical: 14, paddingHorizontal: 20, fontSize: 15, color: '#1e293b' },
  eyeIcon: { paddingRight: 16, paddingVertical: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 32, paddingTop: 20 },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#1c625c' },
});