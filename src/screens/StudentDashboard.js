import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function StudentDashboard({ navigation, profile }) {
  const [studentName, setStudentName] = useState('');
  const [activeClass, setActiveClass] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }

    try {
      const now = new Date().toISOString();

      // 1. Get Name
      const { data: userData } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', profile.id)
        .single();
      
      setStudentName(userData?.full_name || 'Student');

      // 2. Get Enrolled Course IDs
      const { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', profile.id);

      if (enrollErr || !enrollments?.length) {
        setActiveClass(null);
        setUpcomingSessions([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.course_id);

      // 3. Fetch Active Schedule (Filtered by enrollment)
      const { data: active } = await supabase
        .from('schedules')
        .select(`
          id, is_active, end_time,
          courses ( course_code, course_name )
        `)
        .in('course_id', courseIds)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (active) {
        const endTime = new Date(active.end_time);
        const formattedTime = endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        setActiveClass({
          code: active.courses?.course_code || 'N/A',
          name: active.courses?.course_name || 'Unknown',
          closingTime: formattedTime,
        });
      } else {
        setActiveClass(null);
      }

      // 4. Fetch Upcoming Schedules (Filtered by enrollment)
      const { data: upcoming } = await supabase
        .from('schedules')
        .select(`
          id, start_time, end_time,
          courses ( course_code, course_name )
        `)
        .in('course_id', courseIds)
        .eq('is_active', false)
        .gt('start_time', now)
        .order('start_time', { ascending: true })
        .limit(5);

      setUpcomingSessions(upcoming || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const formatTime = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderUpcoming = ({ item }) => (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingCode}>{item.courses?.course_code || 'N/A'}</Text>
        <Text style={styles.upcomingName}>{item.courses?.course_name || 'Unknown'}</Text>
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingTime}>{formatTime(item.start_time)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator style={{ flex: 1 }} color="#1c625c" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={upcomingSessions}
        keyExtractor={item => item.id}
        renderItem={renderUpcoming}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={styles.header}>
              <View>
                <Text style={styles.greetingText}>
                  Hello, <Text style={styles.greetingName}>{studentName}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.profileFab}
                onPress={() => navigation.navigate('StudentProfile', { studentId: profile?.id })}
              >
                <Ionicons name="person-circle-outline" size={36} color="#1c625c" />
              </TouchableOpacity>
            </View>

            {activeClass ? (
              <View style={styles.activeCard}>
                <Text style={styles.cardHeader}>Active Class Now</Text>
                <Text style={styles.courseTitle}>
                  {activeClass.code} - {activeClass.name}
                </Text>
                <Text style={styles.timeText}>Closes at: {activeClass.closingTime}</Text>

                <TouchableOpacity
                  style={styles.checkInBtn}
                  onPress={() => navigation.navigate('QRScanner', { studentId: profile?.id })}
                >
                  <Text style={styles.checkInText}>Check In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noActiveCard}>
                <Ionicons name="time-outline" size={32} color="rgba(255,255,255,0.6)" />
                <Text style={styles.noActiveText}>No active class right now</Text>
                <Text style={styles.noActiveSubtext}>
                  Your instructor will open the attendance window when class begins.
                </Text>
              </View>
            )}

            <View style={styles.upcomingSection}>
              <Text style={styles.sectionTitle}>Upcoming Lectures</Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={36} color="#cbd5e1" />
            <Text style={styles.emptyText}>No upcoming lectures scheduled.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#ffffff' },
  listContent: { paddingHorizontal: 24, paddingBottom: 32 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 40, marginBottom: 24,
  },
  greetingText: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
  greetingName: { fontWeight: '400', fontStyle: 'italic' },
  profileFab:   { padding: 4 },
  activeCard: {
    backgroundColor: '#1c625c',
    borderRadius: 16, padding: 20, marginBottom: 24,
  },
  cardHeader:   { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 10 },
  courseTitle:  { color: '#ffffff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  timeText:     { color: '#e2e8f0', fontSize: 11, marginBottom: 20 },
  checkInBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20,
  },
  checkInText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  noActiveCard: {
    backgroundColor: '#94a3b8',
    borderRadius: 16, padding: 24, marginBottom: 24,
    alignItems: 'center', gap: 8,
  },
  noActiveText:    { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  noActiveSubtext: { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  upcomingSection: { marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  upcomingCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
    borderRadius: 10, padding: 14,
    backgroundColor: '#ffffff', marginBottom: 10,
  },
  upcomingLeft:  { flex: 1, gap: 2 },
  upcomingCode:  { fontSize: 11, fontWeight: '700', color: '#1c625c', letterSpacing: 0.5 },
  upcomingName:  { fontSize: 13, fontWeight: '600', color: '#334155' },
  upcomingRight: { alignItems: 'flex-end', gap: 2 },
  upcomingTime:  { fontSize: 12, fontWeight: '600', color: '#1e293b' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText:  { color: '#94a3b8', fontSize: 14 },
});