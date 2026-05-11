import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { signOut } from '../lib/supabase';

export default function StudentDashboard({ navigation, profile }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.full_name ?? 'Student'} 👋</Text>
        <Text style={styles.role}>Student</Text>
      </View>

      <View style={styles.body}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('QRScanner', { studentId: profile?.id })}
        >
          <Text style={styles.primaryIcon}>📷</Text>
          <Text style={styles.primaryLabel}>Scan QR Code</Text>
          <Text style={styles.primarySub}>Check in to your class</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    backgroundColor: '#6366f1', padding: 24, paddingTop: 56,
  },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  body: { flex: 1, padding: 20 },
  primaryBtn: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 28, alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12,
    borderWidth: 2, borderColor: '#6366f1',
    marginTop: 24,
  },
  primaryIcon: { fontSize: 48, marginBottom: 8 },
  primaryLabel: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  primarySub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  signOutBtn: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#fee2e2',
    marginTop: 'auto',
  },
  signOutText: { color: '#ef4444', fontWeight: '600' },
});