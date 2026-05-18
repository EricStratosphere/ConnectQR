import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';
import EditProfileModal from './components/EditProfileModal';

export default function InstructorProfile({ navigation, route }) {

  const [profile, setProfile]   = useState(route?.params?.profile ?? {});

  const [courses, setCourses]   = useState([]);
  const [stats, setStats]       = useState({ courses: 0, students: 0, avgAttendance: 0, atRisk: 0 });
  const [loading, setLoading]   = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load courses assigned to this instructor ─────────────────────────────
  const loadData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }

    try {
      // 1. Courses
      const { data: courseData, error: courseErr } = await supabase
        .from('courses')
        .select(`
          id, course_name, course_code, is_active,
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

        // 2. At-risk count — adjust table/column to match your schema
        const { count: riskCount } = await supabase
          .from('attendance_summary')           // your view / materialized view
          .select('*', { count: 'exact', head: true })
          .eq('instructor_id', profile.id)
          .lt('attendance_pct', 80);

        // 3. Avg attendance — adjust to your schema
        const { data: avgData } = await supabase
          .from('attendance_summary')
          .select('attendance_pct')
          .eq('instructor_id', profile.id);

        const avg = avgData?.length
          ? Math.round(avgData.reduce((s, r) => s + (r.attendance_pct ?? 0), 0) / avgData.length)
          : 0;

        setStats({
          courses:       enriched.length,
          students:      totalStudents,
          avgAttendance: avg,
          atRisk:        riskCount ?? 0,
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
        .from('profiles') // Adjust if your table is named 'users'
        .update({
          full_name: data.fullName,
          employee_id: data.idNumber,
          department: data.affiliation
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Update local UI immediately
      setProfile(prev => ({
        ...prev,
        full_name: data.fullName,
        employee_id: data.idNumber,
        department: data.affiliation
      }));
      
      Alert.alert('Success', 'Profile updated successfully!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  

  // ── Sign-out ──────────────────────────────────────────────────────────────
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // ── Course list item ──────────────────────────────────────────────────────
  const renderCourseItem = ({ item }) => (
    <View style={styles.courseCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.courseCode}>{item.course_code}</Text>
        <Text style={styles.courseName}>{item.course_name}</Text>
        <Text style={styles.courseMeta}>{item.enrolled_count} student{item.enrolled_count !== 1 ? 's' : ''} enrolled</Text>
      </View>
      <View style={[styles.courseBadge, item.is_active ? styles.badgeActive : styles.badgeInactive]}>
        <Text style={[styles.courseBadgeText, item.is_active ? styles.badgeTextActive : styles.badgeTextInactive]}>
          {item.is_active ? 'ACTIVE' : 'INACTIVE'}
        </Text>
      </View>
    </View>
  );

  // ── Stat tile ─────────────────────────────────────────────────────────────
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
            {/* ── Top bar ── */}
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.topTitle}>Instructor Profile</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => setModalVisible(true)}>
                <Ionicons name="create-outline" size={20} color="#1c625c" />
              </TouchableOpacity>
            </View>

            {/* ── Avatar ── */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={50} color="#cbd5e1" />
                <TouchableOpacity style={styles.cameraBadge}>
                  <Ionicons name="camera" size={13} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.avatarName}>{profile?.full_name ?? 'Instructor'}</Text>
              <Text style={styles.avatarDept}>{profile?.department ?? 'Dept. of Computer Science'}</Text>
            </View>

            {/* ── Stat tiles ── */}
            <View style={styles.statGrid}>
              <StatTile num={stats.courses}       label="Courses Teaching" />
              <StatTile num={stats.students}      label="Total Students" />
              <StatTile num={`${stats.avgAttendance}%`} label="Avg Attendance" />
              <StatTile num={stats.atRisk} label="At-Risk Students" color="#ef4444" />
            </View>

            {/* ── Info box ── */}
            <View style={styles.infoBox}>
              <Text style={styles.infoBoxTitle}>Instructor Information</Text>
              <View style={styles.infoContent}>
                <InfoRow icon="person-outline"    label="Full Name"   value={profile?.full_name ?? '—'} />
                <InfoRow icon="card-outline"      label="Employee ID" value={profile?.employee_id ?? '—'} />
                <InfoRow icon="business-outline"  label="University"  value={profile?.university ?? 'Visayas State University'} />
                <InfoRow icon="library-outline"   label="Department"  value={profile?.department ?? '—'} />
                <InfoRow icon="mail-outline"      label="Email"       value={profile?.email ?? '—'} />
              </View>
            </View>

            {/* ── Section heading for FlatList ── */}
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

// ── Small helper component ────────────────────────────────────────────────────

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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0eff4' },
  listContent: { paddingBottom: 24 },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
  },
  backBtn:  { padding: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  topTitle: { fontSize: 17, fontWeight: '700', color: '#1e293b' },
  editBtn:  { padding: 6 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  avatarCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#d1d5db', justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#1c625c', borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarName: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginTop: 12 },
  avatarDept: { fontSize: 13, color: '#94a3b8', marginTop: 3 },

  // Stat grid
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

  // Info box
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

  // Section title
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginHorizontal: 20, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Course cards
  courseCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 10,
    borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
  },
  courseCode:        { fontSize: 12, fontWeight: '800', color: '#1c625c', letterSpacing: 0.5 },
  courseName:        { fontSize: 14, color: '#334155', fontWeight: '600', marginTop: 2 },
  courseMeta:        { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  courseBadge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 12 },
  badgeActive:       { backgroundColor: '#dcfce7' },
  badgeTextActive:   { color: '#16a34a', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeInactive:     { backgroundColor: '#f1f5f9' },
  badgeTextInactive: { color: '#94a3b8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  courseBadgeText:   {},

  // Empty
  emptyState: { alignItems: 'center', padding: 32, gap: 12 },
  emptyText:  { color: '#94a3b8', fontSize: 14, textAlign: 'center' },

  // Bottom / sign-out
  bottomArea:  { paddingHorizontal: 20, paddingTop: 8 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 24,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#fee2e2',
  },
  signOutText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});