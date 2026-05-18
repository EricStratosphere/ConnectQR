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
        const { data: student } = await supabase
          .from('users')
          .select('full_name, email, role')
          .eq('id', studentId)
          .single();
        
        if (student) {
          setStudentInfo({
            name: student.full_name || 'Student',
            email: student.email || 'No email provided',
            role: student.role || 'student',
          });
        }
        
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select(`
            courses ( id, course_code, course_name )
          `)
          .eq('student_id', studentId);
        
        if (enrollments) {
          const uniqueCourses = enrollments
            .map(enrollment => enrollment.courses)
            .filter(course => course !== null);
            
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
      <View style={styles.classColorBar} />
      <View style={styles.classContent}>
        <Text style={styles.classCode}>{item.course_code}</Text>
        <Text style={styles.className}>{item.course_name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1c625c" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} /> {/* Spacer for perfect centering */}
        </View>

        {/* ── Main ID Card ── */}
        <View style={styles.profileCard}>
          
          <Text style={styles.profileName}>{studentInfo?.name || 'Loading...'}</Text>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{studentInfo?.role}</Text>
          </View>

          <View style={styles.emailRow}>
            <Ionicons name="mail" size={16} color="#94a3b8" />
            <Text style={styles.profileEmail}>{studentInfo?.email}</Text>
          </View>
        </View>

        {/* ── Classes Section ── */}
        <View style={styles.classesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Enrolled Classes</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{registeredClasses.length}</Text>
            </View>
          </View>
          
          {registeredClasses.length > 0 ? (
            <FlatList
              data={registeredClasses}
              keyExtractor={item => item.id}
              renderItem={renderClassItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>You are not enrolled in any classes yet.</Text>
            </View>
          )}
        </View>

        {/* ── Sign Out Button ── */}
        <View style={styles.bottomArea}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' }, // Lighter, cleaner background
  container: { flex: 1, paddingHorizontal: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 24,
  },
  backBtn: {
    padding: 8, backgroundColor: '#ffffff', borderRadius: 12,
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },

  // Main Profile Card
  profileCard: {
    backgroundColor: '#ffffff', borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 32,
    borderWidth: 1, borderColor: '#e2e8f0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  profileName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  
  roleBadge: {
    backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 20, marginBottom: 16,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileEmail: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  // Classes Section
  classesSection: { flex: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  countBadge: {
    backgroundColor: '#1c625c', width: 24, height: 24, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  countText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  
  listContainer: { paddingBottom: 20, gap: 12 },
  classCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    overflow: 'hidden', paddingRight: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  classColorBar: { width: 6, height: '100%', backgroundColor: '#1c625c' },
  classContent: { flex: 1, paddingVertical: 16, paddingHorizontal: 16 },
  classCode: { fontSize: 12, fontWeight: '800', color: '#1c625c', marginBottom: 4, letterSpacing: 0.5 },
  className: { fontSize: 15, color: '#334155', fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },

  // Bottom Area
  bottomArea: { paddingVertical: 16, alignItems: 'center' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 16, borderWidth: 1.5, borderColor: '#fee2e2', gap: 8,
  },
  signOutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});