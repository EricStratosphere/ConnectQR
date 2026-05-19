import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase, signOut } from '../lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  present: { label: 'Present', bg: '#dcfce7', text: '#166534' },
  late:    { label: 'Late',    bg: '#fff7ed', text: '#c2410c' },
  absent:  { label: 'Absent',  bg: '#fef2f2', text: '#b91c1c' },
};

const FILTERS = ['All', 'Present', 'Late', 'Absent'];

function pct(n) { return `${Math.round(n)}%`; }

// ── Screen ────────────────────────────────────────────────────────────────────

export default function StudentProfile({ navigation, route }) {
  const { studentId } = route?.params ?? {};

  const [studentInfo, setStudentInfo] = useState(null);
  const [records, setRecords]         = useState([]);
  const [courseStats, setCourseStats] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Get current user's ID if studentId is not provided
      let targetId = studentId;
      if (!targetId) {
        const { data: { user } } = await supabase.auth.getUser();
        targetId = user?.id;
        if (!targetId) {
          console.warn('No user ID available');
          return;
        }
      }

      const { data: student, error: studentError } = await supabase
        .from('users')
        .select('full_name, email, role')
        .eq('id', targetId)
        .single();
      
      // Handle case where user profile doesn't exist (PGRST116 error)
      if (studentError?.code === 'PGRST116') {
        // Profile doesn't exist yet - use auth user data as fallback
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setStudentInfo({
          name: authUser?.user_metadata?.full_name || 'Student',
          email: authUser?.email || 'No email provided',
          role: 'student',
        });
        console.warn('User profile not found in database, using auth fallback');
      } else if (studentError) {
        console.error('Error fetching student profile:', studentError);
        return;
      } else if (student) {
        setStudentInfo({
          name: student.full_name || 'Student',
          email: student.email || 'No email provided',
          role: student.role || 'student',
        });
      }

      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id, status, timestamp,
          schedules (
            id, start_time, end_time,
            courses ( course_code, course_name ),
            rooms ( room_name )
          )
        `)
        .eq('student_id', targetId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      const rows = data ?? [];
      setRecords(rows);

      const courseMap = {};
      rows.forEach(r => {
        const code = r.schedules?.courses?.course_code;
        if (!code) return;
        if (!courseMap[code]) {
          courseMap[code] = { code, present: 0, late: 0, total: 0 };
        }
        courseMap[code].total += 1;
        if (r.status === 'present') courseMap[code].present += 1;
        if (r.status === 'late')    courseMap[code].late    += 1;
      });

      const codes = Object.keys(courseMap);
      if (codes.length > 0) {
        const { data: schedData } = await supabase
          .from('schedules')
          .select('id, courses!inner ( course_code )')
          .in('courses.course_code', codes);

        const sessionCounts = {};
        (schedData ?? []).forEach(s => {
          const code = s.courses?.course_code;
          if (code) sessionCounts[code] = (sessionCounts[code] || 0) + 1;
        });

        const stats = Object.values(courseMap).map(c => {
          const denom    = sessionCounts[c.code] || c.total;
          const attended = c.present + c.late;
          return { ...c, attendancePct: denom > 0 ? (attended / denom) * 100 : 0 };
        });

        stats.sort((a, b) => a.attendancePct - b.attendancePct);
        setCourseStats(stats);
      } else {
        setCourseStats([]);
      }
    } catch (err) {
      console.error('Profile/History load error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  // Added a confirmation alert since it's an easily tappable icon now
  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await signOut();
            navigation.replace('Login');
          } catch (err) {
            Alert.alert('Error', 'Could not sign out.');
          }
        }
      },
    ]);
  };

  const filtered = activeFilter === 'All'
    ? records
    : records.filter(r => r.status === activeFilter.toLowerCase());

  const presentCount = records.filter(r => r.status === 'present').length;
  const lateCount    = records.filter(r => r.status === 'late').length;
  const absentCount  = records.filter(r => r.status === 'absent').length;
  const overallPct   = records.length > 0 ? ((presentCount + lateCount) / records.length) * 100 : 0;
  const overallColor = overallPct >= 80 ? '#4ade80' : overallPct >= 60 ? '#fb923c' : '#f87171';

  const renderRecord = ({ item }) => {
    const cfg    = STATUS_CFG[item.status] ?? STATUS_CFG.absent;
    const month  = item.schedules?.start_time ? new Date(item.schedules.start_time).toLocaleDateString('en-US', { month: 'short' }) : '—';
    const day    = item.schedules?.start_time ? new Date(item.schedules.start_time).getDate() : '—';
    const time   = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

    return (
      <View style={styles.recordRow}>
        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordCode}>{item.schedules?.courses?.course_code ?? '—'}</Text>
          <Text style={styles.recordName} numberOfLines={1}>{item.schedules?.courses?.course_name ?? 'Unknown Course'}</Text>
          {item.schedules?.rooms?.room_name && (
            <Text style={styles.recordRoom}>
              <Ionicons name="location-outline" size={10} /> {item.schedules.rooms.room_name}
            </Text>
          )}
          <Text style={styles.recordTime}>Checked in at {time}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>
    );
  };

  const renderCourseBar = (stat) => {
    const barColor = stat.attendancePct >= 80 ? '#22c55e' : stat.attendancePct >= 60 ? '#f97316' : '#ef4444';
    const isAtRisk = stat.attendancePct < 80;

    return (
      <View key={stat.code} style={styles.barRow}>
        <View style={styles.barLeft}>
          <Text style={styles.barCode}>{stat.code}</Text>
          {isAtRisk && (
            <View style={styles.atRiskPill}><Text style={styles.atRiskText}>At risk</Text></View>
          )}
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${Math.min(stat.attendancePct, 100)}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={[styles.barPct, { color: barColor }]}>{pct(stat.attendancePct)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}><ActivityIndicator size="large" color="#1c625c" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderRecord}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── Top Bar ── */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
                <Ionicons name="arrow-back" size={24} color="#1e293b" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Student Profile</Text>
              
              {/* ── Sign Out Icon ── */}
              <TouchableOpacity onPress={handleSignOut} style={styles.iconBtnLogout}>
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* ── Main ID Card with Avatar ── */}
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

            {/* ── Overall Summary Card ── */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>OVERALL ATTENDANCE</Text>
                <Text style={[styles.summaryPct, { color: overallColor }]}>{pct(overallPct)}</Text>
                <Text style={styles.summarySub}>{records.length} total sessions</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={styles.summaryTile}>
                  <Text style={[styles.summaryNum, { color: '#4ade80' }]}>{presentCount}</Text>
                  <Text style={styles.summaryLbl}>Present</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={[styles.summaryNum, { color: '#fb923c' }]}>{lateCount}</Text>
                  <Text style={styles.summaryLbl}>Late</Text>
                </View>
                <View style={styles.summaryTile}>
                  <Text style={[styles.summaryNum, { color: '#f87171' }]}>{absentCount}</Text>
                  <Text style={styles.summaryLbl}>Absent</Text>
                </View>
              </View>
            </View>

            {/* ── Per-Course Bars ── */}
            {courseStats.length > 0 && (
              <View style={styles.courseCard}>
                <Text style={styles.sectionTitle}>Attendance by Course</Text>
                {courseStats.map(renderCourseBar)}
              </View>
            )}

            {/* ── Filter Chips ── */}
            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>History</Text>
            <View style={styles.filterRow}>
              {FILTERS.map(f => (
                <TouchableOpacity key={f} style={[styles.chip, activeFilter === f && styles.chipActive]} onPress={() => setActiveFilter(f)}>
                  <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {activeFilter === 'All' ? 'No records found.' : `No ${activeFilter.toLowerCase()} records.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 20, paddingBottom: 40 }, // Increased padding bottom for smooth scrolling

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 24 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  iconBtn: { padding: 8, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  iconBtnLogout: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 12, borderWidth: 1, borderColor: '#fee2e2' },

  // Profile Card
  profileCard: {
    backgroundColor: '#ffffff', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  profileName: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  roleBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  profileEmail: { fontSize: 14, color: '#64748b', fontWeight: '500' },

  // Summary Card
  summaryCard: { backgroundColor: '#1c625c', borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  summaryLeft: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.18)', paddingRight: 16 },
  summaryLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
  summaryPct: { fontSize: 38, fontWeight: '800', marginVertical: 2 },
  summarySub: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  summaryRight: { flex: 1.5, flexDirection: 'row', justifyContent: 'space-around', paddingLeft: 16 },
  summaryTile: { alignItems: 'center', gap: 2 },
  summaryNum: { fontSize: 22, fontWeight: '800' },
  summaryLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },

  // Course Bars
  courseCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  barLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, width: 86 },
  barCode: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
  atRiskPill: { backgroundColor: '#fff7ed', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  atRiskText: { fontSize: 9, fontWeight: '700', color: '#c2410c' },
  barTrack: { flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 3 },
  barFill: { height: 5, borderRadius: 3 },
  barPct: { fontSize: 11, fontWeight: '700', minWidth: 34, textAlign: 'right' },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  chipActive: { backgroundColor: '#1c625c', borderColor: '#1c625c' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextActive: { color: '#fff' },

  // History List
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 },
  dateBox: { width: 36, alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 8, paddingVertical: 6 },
  dateMonth: { fontSize: 10, fontWeight: '700', color: '#1c625c', textTransform: 'uppercase' },
  dateDay: { fontSize: 18, fontWeight: '800', color: '#1e293b', lineHeight: 22 },
  recordInfo: { flex: 1 },
  recordCode: { fontSize: 11, fontWeight: '700', color: '#1c625c', letterSpacing: 0.5 },
  recordName: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 1 },
  recordRoom: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  recordTime: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});