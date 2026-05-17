import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView,Image} from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function LandingScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Center Content: Logo and Tagline */}
      <View style={styles.centerContent}>
        {/* Replace this View with your actual <Image /> later */}
        <View style={styles.logoPlaceholder}>
          <Image source={require('../../assets/cody.png')} style={styles.logoImage} />
        </View>
        
        <Text style={styles.brandName}>ConnectQR</Text>
        <Text style={styles.tagline}>Attendance, simplified!</Text>
      </View>

      {/* Bottom Content: Buttons */}
      <View style={styles.bottomContent}>
        <TouchableOpacity 
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0eff4', 
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholder: {
    width: 170,
    height: 120,
    backgroundColor: '#f0eff4',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0eff4',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  logoText: { color: '#64748b' },
  brandName: {
    fontSize: 42,
    color: '#0f172a',
    fontFamily: 'Pacifico',
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#1c625c', 
    marginTop: 8,
  },
  bottomContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  primaryBtn: {
    backgroundColor: '#1c625c',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: '#475569',
    fontSize: 14,
  },
  loginLink: {
    color: '#1c625c',
    fontSize: 14,
    fontWeight: '700',
  },
  logoImage: {
    width: 170,
    height: 170,
    marginBottom: 20,
  },
});