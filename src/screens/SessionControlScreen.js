import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase, toggleSession, getSessionAttendance } from '../lib/supabase';

const STATUS_COLOR = {
  present: '#22c55e',
  late:    '#f59e0b',
  absent:  '#ef4444',
};

export default function SessionControlScreen({ route }) {
  const { sessionId } = route?.params ?? {};
  const [session, setSession]       = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);

  const loadSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id, is_active, qr_token, start_time, end_time,
        courses ( course_name, course_code ),
        rooms ( room_name )
      `)
      .eq('id', sessionId)
      .single();
    if (!error) setSession(data);
  }, [sessionId]);

  const loadAttendance = useCallback(async () => {
    try {
      const records = await getSessionAttendance(sessionId);
      setAttendance(records);
    } catch (err) {
      console.error('Attendance fetch error:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    const init = async () => {
      await Promise.all([loadSession(), loadAttendance()]);
      setLoading(false);
    };
    init();
  }, [loadSession, loadAttendance]);

  useEffect(() => {
    const channel = supabase
      .channel(`session-roster-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_records',
          filter: `session_id=eq.${sessionId}`,
        },
        async () => { await loadAttendance(); }
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [sessionId, loadAttendance]);

  const handleToggleSession = async () => {
    if (!session) return;
    setToggling(true);
    try {
      const updated = await toggleSession(session.id, !session.is_active);
      setSession(updated);
    } catch (err) {
      Alert.alert('Error', 'Could not update session status.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;
  }

  if (!session) {
    return <View style={styles.center}><Text style={styles.errorText}>Session not found.</Text></View>;
  }

  const presentCount = attendance.filter(r => r.status === 'present').length;
  const lateCount    = attendance.filter(r => r.status === 'late').length;

  const renderRosterItem = ({ item }) => (
    <View style={styles.rosterRow}>
      <View style={styles.rosterLeft}>
        <Text style={styles.rosterName}>{item.users?.full_name ?? '—'}</Text>
        <Text style={styles.rosterEmail}>{item.users?.email ?? ''}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.courseCode}>{session.courses?.course_code}</Text>
        <Text style={styles.courseName}>{session.courses?.course_name}</Text>
        <Text style={styles.roomText}>📍 {session.rooms?.room_name}</Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleBtn, session.is_active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
        onPress={handleToggleSession}
        disabled={toggling}
      >
        {toggling
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.toggleBtnText}>
              {session.is_active ? '🔴 Close Attendance Window' : '🟢 Open Attendance Window'}
            </Text>
        }
      </TouchableOpacity>

      {session.is_active && (
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Students scan this QR code</Text>
          <View style={styles.qrContainer}>
            <QRCode value={session.qr_token} size={200} color="#1e293b" backgroundColor="#fff" />
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#22c55e' }]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#f59e0b' }]}>{lateCount}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#6366f1' }]}>{attendance.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      <Text style={styles.rosterTitle}>Live Roster</Text>

      {attendance.length === 0 ? (
        <View style={styles.emptyRoster}>
          <Text style={styles.emptyText}>No check-ins yet. Waiting for students…</Text>
        </View>
      ) : (
        <FlatList
          data={attendance}
          keyExtractor={item => item.id}
          renderItem={renderRosterItem}
          style={styles.rosterList}
          contentContainerStyle={{ paddingBottom: 40 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#64748b', fontSize: 16 },
  header: { backgroundColor: '#6366f1', padding: 20, paddingTop: 48 },
  courseCode: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  courseName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  roomText: { color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 4 },
  toggleBtn: { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#ef4444' },
  toggleBtnInactive: { backgroundColor: '#22c55e' },
  toggleBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  qrSection: { alignItems: 'center', marginVertical: 8 },
  qrLabel: { fontSize: 14, color: '#64748b', marginBottom: 12, fontWeight: '600' },
  qrContainer: {
    backgroundColor: '#fff', padding: 16, borderRadius: 16,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12,
  },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 12, gap: 8 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', elevation: 2,
  },
  statNum: { fontSize: 28, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  rosterTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginHorizontal: 16, marginBottom: 8 },
  rosterList: { marginHorizontal: 16 },
  rosterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1,
  },
  rosterLeft: { flex: 1 },
  rosterName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  rosterEmail: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  emptyRoster: { margin: 16, padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14 },
});