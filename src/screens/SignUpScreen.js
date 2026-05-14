import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView, Image, ScrollView, Keyboard
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
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

  const handleSignUp = () => {
    navigation.replace('StudentDashboard');
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
          {/* Hide logo when keyboard is open */}
          {!isKeyboardVisible && (
            <View style={styles.topSection}>
               <Image source={require('../../assets/cody.png')} style={styles.logoImage} />
            </View>
          )}

          {/* Remove top border radius when keyboard is open so it looks like a full screen */}
          <View style={[
            styles.bottomSheet,
            isKeyboardVisible && { borderTopLeftRadius: 0, borderTopRightRadius: 0, paddingTop: 60 }
          ]}>
            <Text style={styles.title}>Sign Up</Text>

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
                  <Ionicons 
                    name={showPassword ? 'eye-off' : 'eye'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleSignUp}>
              <Text style={styles.btnText}>Create Account</Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or Sign up with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Added Google and Facebook Icons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialBtn}>
                 <Ionicons name="logo-google" size={24} color="#EA4335" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                 <Ionicons name="logo-facebook" size={24} color="#1877F2" />
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
  topSection: {
    height: 200,
    paddingHorizontal: 32,
    paddingTop: 20,
    justifyContent: 'flex-end',
  },
  logoImage: { width: 100, height: 100, marginBottom: 0 },
  bottomSheet: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    paddingHorizontal: 32, paddingTop: 32,
    elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#1c625c', marginBottom: 6, marginLeft: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 20,
    paddingVertical: 12, paddingHorizontal: 20, fontSize: 15, color: '#1e293b',
  },
  btn: { backgroundColor: '#1c625c', borderRadius: 20, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#cbd5e1' },
  dividerText: { marginHorizontal: 12, fontSize: 12, color: '#64748b' },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingBottom: 30 },
  socialBtn: {
    flex: 1, height: 48, borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff',
  },
  passwordContainer: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#1c625c',
    borderRadius: 20, backgroundColor: '#ffffff',
  },
  passwordInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 20, fontSize: 15, color: '#1e293b' },
  eyeIcon: { paddingRight: 16, paddingVertical: 10 },
});