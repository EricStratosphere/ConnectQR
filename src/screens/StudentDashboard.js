import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { signOut } from '../lib/supabase';

export default function StudentDashboard({ navigation, profile }) {
  // Hardcoded class data to match the design (replace with your dynamic state later)
  const activeClass = {
    code: 'CSci 145',
    name: 'Platform Based Development',
    closingTime: '10:15 AM',
  };

  const upcomingClass = {
    code: 'CSci 121',
    name: 'Computer Organization',
  };

  // Determine the display name (defaults to 'student' if no profile name exists)
  const displayName = profile?.full_name ? profile.full_name.toLowerCase() : 'student';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greetingText}>
          Hello, <Text style={styles.greetingName}>{displayName}</Text>
        </Text>
      </View>

      {/* Active Class Card */}
      <View style={styles.activeCard}>
        <Text style={styles.cardHeader}>Active Class Now</Text>
        <Text style={styles.courseTitle}>
          {activeClass.code} - {activeClass.name}
        </Text>
        <Text style={styles.timeText}>Closes on : {activeClass.closingTime}</Text>

        <TouchableOpacity
          style={styles.checkInBtn}
          onPress={() => navigation.navigate('QRScanner', { studentId: profile?.id })}
        >
          <Text style={styles.checkInText}>Check In</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Lectures Section */}
      <View style={styles.upcomingSection}>
        <Text style={styles.sectionTitle}>Upcoming Lectures</Text>
        <View style={styles.upcomingCard}>
          <Text style={styles.upcomingCourseText}>
            {upcomingClass.code} - {upcomingClass.name}
          </Text>
        </View>
      </View>

      {/* Bottom Actions (Profile & Sign Out) */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.profileFab}
          onPress={() => navigation.navigate('StudentProfile', { studentId: profile?.id })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e293b',
  },
  greetingName: {
    /* Note: To exactly match the cursive font in the image, you will need to load 
      a custom font (e.g., 'Pacifico' or 'DancingScript') and apply fontFamily here. 
      Using italic as a fallback. 
    */
    fontWeight: '400',
    fontStyle: 'italic', 
  },
  activeCard: {
    backgroundColor: '#1c625c', // Dark teal matching the design
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardHeader: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  courseTitle: {
    color: '#ffffff',
    fontSize: 12,
    marginBottom: 16,
  },
  timeText: {
    color: '#e2e8f0',
    fontSize: 11,
    marginBottom: 24,
  },
  checkInBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  checkInText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  upcomingSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  upcomingCard: {
    borderWidth: 1,
    borderColor: '#334155', // Darker border matching the screenshot
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  upcomingCourseText: {
    fontSize: 12,
    color: '#334155',
  },
  bottomArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  profileFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1c625c',
    marginBottom: 24,
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  signOutBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
});