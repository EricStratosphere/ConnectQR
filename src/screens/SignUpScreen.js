import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Image, ScrollView, Keyboard, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signUp } from '../lib/supabase';

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [role, setRole] = useState('student');

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

  const handleSignUp = async () => {
    if (!username || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email.trim(), password, username, role);
      Alert.alert('Success', 'Account created! Please log in.');
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Sign Up Failed', err.message ?? 'Could not create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isKeyboardVisible && (
            <View style={styles.topSection}>
               <Image source={require('../../assets/cody.png')} style={styles.logoImage} />
            </View>
          )}

          <View style={[
            styles.bottomSheet,
            isKeyboardVisible && { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 60 }
          ]}>
            <Text style={styles.title}>Sign Up</Text>

            {/* Role Selection Toggle */}
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'student' && styles.roleBtnActive]}
                onPress={() => setRole('student')}
              >
                <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>Student</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'instructor' && styles.roleBtnActive]}
                onPress={() => setRole('instructor')}
              >
                <Text style={[styles.roleText, role === 'instructor' && styles.roleTextActive]}>Instructor</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSignUp} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Create Account</Text>
              }
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Log In</Text>
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
  topSection: { height: 200, paddingHorizontal: 32, paddingTop: 20, justifyContent: 'flex-end' },
  logoImage: { width: 100, height: 100, marginBottom: 0 },
  bottomSheet: {
    flex: 1, backgroundColor: '#ffffff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 32, paddingTop: 32,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  roleContainer: {
    flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16,
  },
  roleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  roleBtnActive: { backgroundColor: '#1c625c' },
  roleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  roleTextActive: { color: '#ffffff' },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#1c625c', marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 20,
    paddingVertical: 12, paddingHorizontal: 20, fontSize: 15, color: '#1e293b',
  },
  btn: { backgroundColor: '#1c625c', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#1c625c',
    borderRadius: 20, backgroundColor: '#ffffff',
  },
  passwordInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, fontSize: 15, color: '#1e293b' },
  eyeIcon: { paddingRight: 16, paddingVertical: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 32, paddingTop: 20 },
  footerText: { fontSize: 14, color: '#64748b' },
  footerLink: { fontSize: 14, fontWeight: '700', color: '#1c625c' },
});