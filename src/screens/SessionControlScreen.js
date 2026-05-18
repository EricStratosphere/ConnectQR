import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, SafeAreaView
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase, toggleSession, getSessionAttendance } from '../lib/supabase';

// UPDATED: Softer, more professional color palette
const STATUS_COLOR = {
  present: '#059669', // Deep Emerald (instead of neon green)
  late:    '#d97706', // Muted Amber
  absent:  '#e11d48', // Soft Rose (instead of bright red)
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
      setSession(prev => ({ 
        ...prev, 
        is_active: updated.is_active 
      }));
    } catch (err) {
      Alert.alert('Error', 'Could not update session status.');
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1c625c" /></View>;
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
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '15' }]}>
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
              {session.is_active ? 'Close Attendance Window' : 'Open Attendance Window'}
            </Text>
        }
      </TouchableOpacity>

      {session.is_active && (
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Students scan this QR code</Text>
          <View style={styles.qrContainer}>
            <QRCode value={session.qr_token} size={200} color="#0f172a" backgroundColor="#fff" />
          </View>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: STATUS_COLOR.present }]}>{presentCount}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: STATUS_COLOR.late }]}>{lateCount}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#1c625c' }]}>{attendance.length}</Text>
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
  header: { 
    backgroundColor: '#1c625c', 
    padding: 20, 
    paddingTop: 48, 
    paddingBottom: 40, 
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24 
  },
  courseCode: { color: '#dcfce7', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  courseName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  roomText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, fontWeight: '500' },
  
  toggleBtn: { 
    marginHorizontal: 16, 
    marginTop: -24, 
    padding: 16, 
    borderRadius: 16, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  toggleBtnActive: { backgroundColor: '#e11d48' }, // Muted Rose
  toggleBtnInactive: { backgroundColor: '#059669' }, // Deep Emerald
  toggleBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  qrSection: { alignItems: 'center', marginVertical: 20 },
  qrLabel: { fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  qrContainer: {
    backgroundColor: '#fff', padding: 24, borderRadius: 24,
    elevation: 6, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 16, gap: 12 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#f1f5f9',
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 6,
  },
  statNum: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  rosterTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginHorizontal: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  rosterList: { marginHorizontal: 16 },
  rosterRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1,
    borderWidth: 1, borderColor: '#f1f5f9'
  },
  rosterLeft: { flex: 1 },
  rosterName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  rosterEmail: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  emptyRoster: { margin: 16, padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
});