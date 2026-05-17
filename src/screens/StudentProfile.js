import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// === ORIGINAL CODE (UNCOMMENT LATER) ===
// import { signOut } from '../lib/supabase';

export default function StudentProfile({ navigation }) {
  // Mock data for the disconnected state
  const studentInfo = {
    name: 'Bea R. Molar',
    university: 'Visayas State University',
    program: 'BS Computer Science',
    studentId: '2022-XXXX',
  };

  const registeredClasses = [
    { id: '1', code: 'CSci 145', name: 'Platform Based Development' },
    { id: '2', code: 'CSci 121', name: 'Computer Organization' },
  ];

  const handleSignOut = () => {
    // === RESTORE THIS LATER FOR REAL SUPABASE AUTH ===
    // signOut();
    // =================================================

    // Temporary bypass for testing UI: Sends you back to the Login screen
    navigation.replace('Login');
  };

  const renderClassItem = ({ item }) => (
    <View style={styles.classCard}>
      <Text style={styles.classCode}>{item.code}</Text>
      <Text style={styles.className}>{item.name}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Student's Profile</Text>
          <View style={{ width: 24 }} /> {/* Spacer for centering */}
        </View>

        {/* Avatar Placeholder */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={50} color="#cbd5e1" />
          </View>
        </View>

        {/* Student Information Box (Updated to match the Dark Teal theme) */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Student's Information:</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>{studentInfo.name}</Text>
            <Text style={styles.infoText}>{studentInfo.program}</Text>
            <Text style={styles.infoText}>{studentInfo.university}</Text>
            <Text style={styles.infoId}>ID: {studentInfo.studentId}</Text>
          </View>
        </View>

        {/* Registered Classes Section */}
        <View style={styles.classesSection}>
          <Text style={styles.sectionTitle}>Registered Classes</Text>
          
          <FlatList
            data={registeredClasses}
            keyExtractor={item => item.id}
            renderItem={renderClassItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        </View>

        {/* New Sign Out Button with Icon */}
        <View style={styles.bottomArea}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#f0eff4' 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 24 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 32,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#d1d5db', 
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff', // Added a white border to make it pop
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  infoBox: {
    backgroundColor: '#1c625c', // Updated to Dark Teal to match your picture
    padding: 24,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)', // Lighter text for the dark background
    marginBottom: 16,
  },
  infoContent: {
    gap: 6,
  },
  infoName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '500',
  },
  infoId: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  classesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  listContainer: {
    paddingBottom: 20,
    gap: 12,
  },
  classCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  classCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1c625c', 
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  className: {
    fontSize: 15,
    color: '#334155',
    fontWeight: '600',
  },
  bottomArea: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#fee2e2', // Light red border
    gap: 8, // Space between icon and text
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 15,
  },
});