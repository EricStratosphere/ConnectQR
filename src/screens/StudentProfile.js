import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { supabase, signOut } from '../lib/supabase';

export default function StudentProfile({ navigation, route }) {
  const { studentId } = route?.params ?? {};
  const [studentInfo, setStudentInfo] = useState(null);
  const [registeredClasses, setRegisteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        // Fetch student profile
        const { data: student } = await supabase
          .from('users')
          .select('*')
          .eq('id', studentId)
          .single();
        
        if (student) {
          setStudentInfo({
            name: student.full_name || 'Student',
            university: student.university || 'N/A',
            program: student.program || 'N/A',
            studentId: student.id,
          });
        }
        
        // Fetch registered courses/classes
        const { data: schedules } = await supabase
          .from('schedules')
          .select(`
            id, 
            courses ( id, course_code, course_name )
          `)
          .order('start_time', { ascending: false });
        
        if (schedules) {
          const uniqueCourses = schedules
            .filter(schedule => schedule.courses)
            .reduce((acc, schedule) => {
              const courseExists = acc.find(c => c.id === schedule.courses.id);
              if (!courseExists) {
                acc.push({
                  id: schedule.courses.id,
                  code: schedule.courses.course_code,
                  name: schedule.courses.course_name,
                });
              }
              return acc;
            }, []);
          setRegisteredClasses(uniqueCourses);
        }
      } catch (err) {
        console.log('Error loading student data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (studentId) loadStudentData();
  }, [studentId]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.replace('Login');
    } catch (err) {
      Alert.alert('Error', 'Could not sign out.');
    }
  };

  const renderClassItem = ({ item }) => (
    <View style={styles.classCard}>
      <Text style={styles.classCode}>{item.code}</Text>
      <Text style={styles.className}>{item.name}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

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

        {/* Student Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>Student's Information:</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoName}>{studentInfo?.name || 'Loading...'}</Text>
            <Text style={styles.infoText}>{studentInfo?.program || 'N/A'}</Text>
            <Text style={styles.infoText}>{studentInfo?.university || 'N/A'}</Text>
            <Text style={styles.infoId}>ID: {studentInfo?.studentId || 'N/A'}</Text>
          </View>
        </View>

        {/* Registered Classes Section */}
        <View style={styles.classesSection}>
          <Text style={styles.sectionTitle}>Registered Classes</Text>
          
          {registeredClasses.length > 0 ? (
            <FlatList
              data={registeredClasses}
              keyExtractor={item => item.id}
              renderItem={renderClassItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.classCard}>
              <Text style={styles.classCode}>No classes enrolled</Text>
            </View>
          )}
        </View>

        {/* Sign Out Button */}
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