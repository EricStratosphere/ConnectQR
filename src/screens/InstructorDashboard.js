import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';

import { exportToCSV, exportToPDF } from './utils/exportUtils';
import AddCourseModal from './components/AddCourseModal';

const { width } = Dimensions.get('window');

// ─── Helpers ────────────────────────────────────────────────────────────────

function AttendanceBar({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <View>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%` }]} />
      </View>
      <Text style={styles.barLabel}>{value} / {total} enrolled · {pct}%</Text>
    </View>
  );
}

// ─── Sub-screens ─────────────────────────────────────────────────────────────

function SessionsTab({ sessions, loading, navigation }) {
  const today = new Date().toDateString();

  const todaySessions  = sessions.filter(s => new Date(s.start_time).toDateString() === today);
  const prevSessions   = sessions.filter(s => new Date(s.start_time).toDateString() !== today);

  const renderSession = ({ item }) => {
    const isUpcoming = !item.is_active && new Date(item.start_time) > new Date();
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SessionControl', { sessionId: item.id })}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardCode}>{item.courses?.course_code}</Text>
          <Text style={styles.cardName}>{item.courses?.course_name}</Text>
          <Text style={styles.cardMeta}>
            📍 {item.rooms?.room_name}
            {item.start_time
              ? `  ·  ${new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </Text>
        </View>
        <View style={[
          styles.badge,
          item.is_active ? styles.badgeLive
            : isUpcoming ? styles.badgeUpcoming
            : styles.badgeClosed,
        ]}>
          <Text style={[
            styles.badgeText,
            item.is_active ? styles.badgeTextLive
              : isUpcoming ? styles.badgeTextUpcoming
              : styles.badgeTextClosed,
          ]}>
            {item.is_active ? 'LIVE' : isUpcoming ? 'UPCOMING' : 'CLOSED'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#1c625c" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      {todaySessions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Today's Sessions</Text>
          {todaySessions.map(item => (
            <View key={item.id}>{renderSession({ item })}</View>
          ))}
        </>
      )}

      {prevSessions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Previous Sessions</Text>
          {prevSessions.map(item => (
            <View key={item.id}>{renderSession({ item })}</View>
          ))}
        </>
      )}

      {sessions.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No sessions found. Create one in Supabase to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function CoursesTab({ courses, loading, onAddPress}) {
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#1c625c" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Add New Course</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Courses</Text>

      {courses.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No courses assigned yet.</Text>
        </View>
      )}

      {courses.map(course => (
        <View key={course.id} style={styles.card}>
          <View style={styles.courseHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardCode}>{course.course_code}</Text>
              <Text style={styles.cardName}>{course.course_name}</Text>
            </View>
            <View style={[styles.badge, course.is_active ? styles.badgeLive : styles.badgeClosed]}>
              <Text style={[styles.badgeText, course.is_active ? styles.badgeTextLive : styles.badgeTextClosed]}>
                {course.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
          {course.rooms?.room_name && (
            <Text style={styles.cardMeta}>📍 {course.rooms.room_name}</Text>
          )}
          <View style={{ marginTop: 10 }}>
            <AttendanceBar
              value={course.enrolled_count ?? 0}
              total={course.capacity ?? 40}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ReportsTab({ sessions, atRiskStudents, loadingRisk }) {
  const weeklyData = sessions.slice(0, 5).map(s => ({
    label: new Date(s.start_time).toLocaleDateString([], { weekday: 'short' }),
    pct: s.attendance_pct ?? Math.floor(Math.random() * 25 + 70), 
  }));

  const maxPct = 100;

  const handleExport = async (format) => {
    try {
      const dataToExport = atRiskStudents.map(student => ({
        Name: student.full_name,
        Course: student.course_code,
        Absences: student.absences,
        Attendance_Rate: `${student.attendance_pct}%`
      }));

      if (format === 'CSV') await exportToCSV(dataToExport);
      if (format === 'PDF') await exportToPDF(dataToExport);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to generate file.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <View style={styles.exportRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('CSV')}>
          <Ionicons name="download-outline" size={16} color="#1c625c" />
          <Text style={styles.exportBtnText}>Export CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportBtn} onPress={() => handleExport('PDF')}>
          <Ionicons name="document-outline" size={16} color="#1c625c" />
          <Text style={styles.exportBtnText}>Export PDF</Text>
        </TouchableOpacity>
      </View>

      {weeklyData.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.chartTitle}>Weekly Attendance</Text>
          <View style={styles.barChart}>
            {weeklyData.map((d, i) => (
              <View key={i} style={styles.barCol}>
                <Text style={styles.barPct}>{d.pct}%</Text>
                <View style={styles.barWrapper}>
                  <View style={[
                    styles.barInner,
                    {
                      height: (d.pct / maxPct) * 80,
                      backgroundColor: d.pct < 75 ? '#f59e0b' : '#1c625c',
                    },
                  ]} />
                </View>
                <Text style={styles.barDay}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
        At-Risk Students{' '}
        <Text style={{ color: '#ef4444', fontWeight: '400', fontSize: 12 }}>(missing &gt;20%)</Text>
      </Text>

      {loadingRisk && <ActivityIndicator color="#1c625c" style={{ marginTop: 16 }} />}

      {!loadingRisk && atRiskStudents.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="checkmark-circle-outline" size={40} color="#22c55e" />
          <Text style={[styles.emptyText, { color: '#22c55e' }]}>No at-risk students. Great attendance!</Text>
        </View>
      )}

      {atRiskStudents.map((s, i) => (
        <View key={i} style={styles.riskCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.riskName}>{s.full_name}</Text>
            <Text style={styles.riskMeta}>
              {s.course_code} · {s.absences} absences · {s.attendance_pct}% attended
            </Text>
          </View>
          <View style={styles.riskBadge}>
            <Text style={styles.riskBadgeText}>AT RISK</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const TABS = ['Sessions', 'Courses', 'Reports'];

export default function InstructorDashboard({ navigation, profile }) {
  const [activeTab, setActiveTab]         = useState(0);
  const [sessions, setSessions]           = useState([]);
  const [courses, setCourses]             = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [loadingRisk, setLoadingRisk]     = useState(false);
  const [modalVisible, setModalVisible]   = useState(false);
  const [addingCourse, setAddingCourse]   = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const loadSessions = useCallback(async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id, is_active, start_time, end_time,
        courses!inner ( course_name, course_code, instructor_id ),
        rooms ( room_name )
      `)
      .eq('courses.instructor_id', profile?.id)
      .order('start_time', { ascending: false })
      .limit(20);

    if (!error) setSessions(data ?? []);
  }, [profile?.id]);

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id, course_name, course_code, is_active, capacity,
        rooms ( room_name ),
        enrollments ( count )
      `)
      .eq('instructor_id', profile?.id);

    if (!error) {
      const enriched = (data ?? []).map(c => ({
        ...c,
        enrolled_count: c.enrollments?.[0]?.count ?? 0,
      }));
      setCourses(enriched);
    }
  }, [profile?.id]);

  const loadAtRisk = useCallback(async () => {
    setLoadingRisk(true);
    try {
      const { data, error } = await supabase
        .from('attendance_summary')          
        .select('full_name, course_code, absences, attendance_pct')
        .eq('instructor_id', profile?.id)
        .lt('attendance_pct', 80)            
        .order('attendance_pct', { ascending: true });

      if (!error) setAtRiskStudents(data ?? []);
    } catch (_) {
    } finally {
      setLoadingRisk(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    const init = async () => {
      await Promise.all([loadSessions(), loadCourses()]);
      setLoading(false);
      loadAtRisk();
    };
    init();
  }, [profile?.id, loadSessions, loadCourses, loadAtRisk]);

  const handleAddCourse = async (courseData) => {
    setAddingCourse(true);
    try {
      const { error } = await supabase.from('courses').insert({
        instructor_id: profile.id,
        course_code: courseData.courseCode,
        course_name: courseData.courseName,
        capacity: courseData.capacity,
        is_active: true
      });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Course added successfully!');
      setModalVisible(false);
      loadCourses(); 
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setAddingCourse(false);
    }
  };

  const liveCount = sessions.filter(s => s.is_active).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.full_name ?? 'Instructor'} 👋</Text>
            <Text style={styles.subtitle}>{profile?.department ?? 'Instructor'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => navigation.navigate('InstructorProfile', { profile })}
          >
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{courses.length}</Text>
            <Text style={styles.statLbl}>Courses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{liveCount}</Text>
            <Text style={styles.statLbl}>Live Now</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{atRiskStudents.length}</Text>
            <Text style={styles.statLbl}>At-Risk</Text>
          </View>
        </View>
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, activeTab === i && styles.tabItemActive]}
            onPress={() => setActiveTab(i)}
          >
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 0 && (
        <SessionsTab sessions={sessions} loading={loading} navigation={navigation} />
      )}
      {activeTab === 1 && (
        <CoursesTab courses={courses} loading={loading} onAddPress={() => setModalVisible(true)} />
      )}
      {activeTab === 2 && (
        <ReportsTab
          sessions={sessions}
          atRiskStudents={atRiskStudents}
          loadingRisk={loadingRisk}
        />
      )}

      {/* Renders the modal if it exists */}
      {AddCourseModal && (
        <AddCourseModal 
          visible={modalVisible} 
          onClose={() => setModalVisible(false)} 
          onSubmit={handleAddCourse}
          loading={addingCourse}
        />
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { backgroundColor: '#1c625c', padding: 20, paddingTop: 52 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting:     { color: '#fff', fontSize: 20, fontWeight: '700' },
  subtitle:     { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  profileBtn:   { padding: 4 },
  statRow:      { flexDirection: 'row', gap: 8 },
  statCard:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statNum:      { color: '#fff', fontSize: 22, fontWeight: '700' },
  statLbl:      { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabItem:      { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive:{ borderBottomColor: '#1c625c' },
  tabText:      { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive:{ color: '#1c625c' },
  tabContent:   { padding: 16, gap: 10, paddingBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e2e8f0',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
  },
  cardLeft:     { flex: 1 },
  cardCode:     { fontSize: 11, color: '#1c625c', fontWeight: '700', letterSpacing: 1 },
  cardName:     { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  cardMeta:     { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  courseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  badge:            { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 12, alignSelf: 'flex-start' },
  badgeText:        { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeLive:        { backgroundColor: '#dcfce7' },
  badgeTextLive:    { color: '#16a34a' },
  badgeClosed:      { backgroundColor: '#f1f5f9' },
  badgeTextClosed:  { color: '#94a3b8' },
  badgeUpcoming:    { backgroundColor: '#eff6ff' },
  badgeTextUpcoming:{ color: '#2563eb' },
  barBg:    { height: 6, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  barFill:  { height: '100%', backgroundColor: '#1c625c', borderRadius: 4 },
  barLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  addBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1c625c', borderRadius: 12, padding: 14, marginBottom: 6 },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  exportBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1.5, borderColor: '#1c625c',
    borderRadius: 12, padding: 12, backgroundColor: '#fff',
  },
  exportBtnText: { color: '#1c625c', fontWeight: '600', fontSize: 13 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#1e293b', marginBottom: 12 },
  barChart:   { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 6 },
  barCol:     { flex: 1, alignItems: 'center', gap: 4 },
  barWrapper: { width: '100%', height: 80, justifyContent: 'flex-end' },
  barInner:   { width: '100%', borderRadius: 4 },
  barPct:     { fontSize: 10, fontWeight: '600', color: '#1c625c' },
  barDay:     { fontSize: 10, color: '#94a3b8' },
  riskCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  riskName:        { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  riskMeta:        { fontSize: 12, color: '#ea580c', marginTop: 3, fontWeight: '500' },
  riskBadge:       { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  riskBadgeText:   { fontSize: 11, fontWeight: '700', color: '#ea580c' },
  empty:     { alignItems: 'center', padding: 32, gap: 12 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#fee2e2',
  },
  signOutText: { color: '#ef4444', fontWeight: '600', fontSize: 14 },
});