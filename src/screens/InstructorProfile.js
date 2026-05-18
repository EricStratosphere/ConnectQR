import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import EditProfileModal from './components/EditProfileModal';

export default function InstructorProfile({ navigation, route }) {
  const [profile, setProfile] = useState(route?.params?.profile ?? {});
  const [courses, setCourses] = useState([]);
  const [stats, setStats]     = useState({ courses: 0, students: 0, avgAttendance: 0, atRisk: 0 });
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }

    try {
      // Fetch Courses (removed is_active since it's not in schema)
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select(`
          id, course_name, course_code,
          enrollments ( count )
        `)
        .eq('instructor_id', profile.id);

      if (!courseErr && courseData) {
        const enriched = courseData.map(c => ({
          ...c,
          enrolled_count: c.enrollments?.[0]?.count ?? 0,
        }));
        setCourses(enriched);

        const totalStudents = enriched.reduce((sum, c) => sum + c.enrolled_count, 0);

        // Fetch At-risk count (Assuming attendance_summary is a view you created)
        const { count: riskCount } = await supabase
          .from('attendance_summary')
          .select('*', { count: 'exact', head: true })
          .eq('instructor_id', profile.id)
          .lt('attendance_pct', 80);

        // Fetch Avg attendance
        const { data: avgData } = await supabase
          .from('attendance_summary')
          .select('attendance_pct')
          .eq('instructor_id', profile.id);

        const avg = avgData?.length
          ? Math.round(avgData.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / avgData.length)
          : 0;

        setStats({
          courses: enriched.length,
          students: totalStudents,
          avgAttendance: avg,
          atRisk: riskCount ?? 0,
        });
      }
    } catch (err) {
      console.error('InstructorProfile load error:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEditProfile = async (data) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('users') 
        .update({
          full_name: data.fullName,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile(prev => ({
        ...prev,
        full_name: data.fullName,
      }));
      
      Alert.alert('Success', 'Profile updated successfully!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const renderCourseItem = ({ item }) => (
    <View style={styles.courseCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.courseCode}>{item.course_code}</Text>
        <Text style={styles.courseName}>{item.course_name}</Text>
        <Text style={styles.courseMeta}>{item.enrolled_count} student{item.enrolled_count !== 1 ? 's' : ''} enrolled</Text>
      </View>
    </View>
  );

  const StatTile = ({ num, label, color }) => (
    <View style={styles.statTile}>
      <Text style={[styles.statNum, { color: color ?? '#1c625c' }]}>{num}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator style={{ flex: 1 }} color="#1c625c" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={courses}
        keyExtractor={item => item.id}
        renderItem={renderCourseItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.topTitle}>Instructor Profile</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="create-outline" size={20} color="#1c625c" />
              </TouchableOpacity>
            </View>

            <View style={styles.avatarSection}>
              <Text style={styles.avatarName}>{profile?.full_name ?? 'Instructor'}</Text>
              <Text style={styles.avatarDept}>Instructor</Text>
            </View>

            <View style={styles.statGrid}>
              <StatTile num={stats.courses}       label="Courses" />
              <StatTile num={stats.students}      label="Students" />
              <StatTile num={`${stats.avgAttendance}%`} label="Attendance" />
              <StatTile num={stats.atRisk} label="At-Risk" color="#ef4444" />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Information</Text>
              <View style={styles.infoContent}>
                <InfoRow icon="person-outline"    label="Full Name"   value={profile?.full_name ?? '—'} />
                <InfoRow icon="mail-outline"      label="Email"       value={profile?.email ?? '—'} />
              </View>
            </View>

            <Text style={styles.sectionTitle}>Assigned Courses</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>No courses assigned yet.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.bottomArea}>
            <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <EditProfileModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onSubmit={handleEditProfile}
        loading={saving}
        profileData={profile}
        role="instructor"
      />
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon} size={14} color="rgba(255,255,255,0.65)" style={{ marginRight: 6 }} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0eff4' },
  listContent: { paddingBottom: 24 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 8,
  },
  backBtn:  { padding: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  editBtn:  { padding: 6 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 12 },
  avatarDept: { fontSize: 13, color: '#94a3b8', marginTop: 3 },
  statGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 10, marginBottom: 20,
  },
  statTile: {
    width: '47%', backgroundColor: '#fff', borderRadius: 12,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1,
  },
  statNum: { fontSize: 24, fontWeight: '700' },
  statLbl: { fontSize: 11, color: '#94a3b8', marginTop: 3, textAlign: 'center' },
  infoBox: {
    backgroundColor: '#1c625c', marginHorizontal: 20,
    borderRadius: 16, padding: 20, marginBottom: 24,
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 8,
  },
  infoBoxTitle: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoContent:  { gap: 0 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center' },
  infoLabel:   { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  infoValue:   { fontSize: 13, color: '#fff', fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginHorizontal: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  courseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  courseCode: { fontSize: 12, fontWeight: '800', color: '#1c625c', letterSpacing: 0.5 },
  courseName: { fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 },
  courseMeta: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText:  { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  bottomArea:  { paddingHorizontal: 20, paddingTop: 8 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#fee2e2',
  },
  signOutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});