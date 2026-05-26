import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, Modal, ScrollView
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { supabase, toggleSession, getSessionAttendance } from '../lib/supabase';

const STATUS_COLOR = {
  present: '#059669', 
  late:    '#d97706', 
  absent:  '#e11d48', 
  excused: '#3b82f6', // Added Excused Status
};

export default function SessionControlScreen({ route }) {
  const { sessionId } = route?.params ?? {};
  const [session, setSession]       = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [unmarkedStudents, setUnmarkedStudents] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [toggling, setToggling]     = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  const loadSession = useCallback(async () => {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        id, is_active, qr_token, start_time, end_time, course_id,
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
        { event: 'INSERT', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${sessionId}` },
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
      setSession(prev => ({ ...prev, is_active: updated.is_active }));
    } catch (err) {
      Alert.alert('Error', 'Could not update session status.');
    } finally {
      setToggling(false);
    }
  };

  const openManualEntry = async () => {
    try {
      // Fetch all students enrolled in this course
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('student_id, users (id, full_name, email)')
        .eq('course_id', session.course_id);
      
      const enrolledUsers = enrollments?.map(e => e.users) || [];
      const presentIds = attendance.map(a => a.users?.id);
      
      // Filter out students who are already checked in
      const unmarked = enrolledUsers.filter(u => !presentIds.includes(u.id));
      setUnmarkedStudents(unmarked);
      setManualModalVisible(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch enrolled students.');
    }
  };

  const handleManualMark = async (studentId, status = 'present') => {
    try {
      const { error } = await supabase.from('attendance_records').insert({
        session_id: sessionId,
        student_id: studentId,
        status: status,
        timestamp: new Date().toISOString()
      });
      if (error) throw error;
      
      Alert.alert('Success', `Student marked as ${status}.`);
      setUnmarkedStudents(prev => prev.filter(s => s.id !== studentId));
      await loadAttendance();
    } catch (error) {
      Alert.alert('Error', 'Could not update attendance.');
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1c625c" /></View>;
  if (!session) return <View style={styles.center}><Text style={styles.errorText}>Session not found.</Text></View>;

  const renderRosterItem = ({ item }) => (
    <View style={styles.rosterRow}>
      <View style={styles.rosterLeft}>
        <Text style={styles.rosterName}>{item.users?.full_name ?? '—'}</Text>
        <Text style={styles.rosterEmail}>{item.users?.email ?? ''}</Text>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '15' }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>{item.status.toUpperCase()}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Existing Header & Controls */}
      <View style={styles.header}>
        <Text style={styles.courseCode}>{session.courses?.course_code}</Text>
        <Text style={styles.courseName}>{session.courses?.course_name}</Text>
        <Text style={styles.roomText}>📍 {session.rooms?.room_name}</Text>
      </View>

      <TouchableOpacity
        style={[styles.toggleBtn, session.is_active ? styles.toggleBtnActive : styles.toggleBtnInactive]}
        onPress={handleToggleSession} disabled={toggling}
      >
        {toggling ? <ActivityIndicator color="#fff" /> : <Text style={styles.toggleBtnText}>{session.is_active ? 'Close Attendance Window' : 'Open Attendance Window'}</Text>}
      </TouchableOpacity>

      {session.is_active && (
        <View style={styles.qrSection}>
          <Text style={styles.qrLabel}>Students scan this QR code</Text>
          <View style={styles.qrContainer}>
            <QRCode value={session.qr_token} size={200} color="#0f172a" backgroundColor="#fff" />
          </View>
        </View>
      )}

      {/* Header Row for Roster & Manual Button */}
      <View style={styles.rosterHeaderRow}>
        <Text style={styles.rosterTitle}>Live Roster ({attendance.length})</Text>
        <TouchableOpacity style={styles.manualBtn} onPress={openManualEntry}>
          <Ionicons name="hand-right-outline" size={16} color="#1c625c" />
          <Text style={styles.manualBtnText}>Manual Entry</Text>
        </TouchableOpacity>
      </View>

      {attendance.length === 0 ? (
        <View style={styles.emptyRoster}><Text style={styles.emptyText}>No check-ins yet. Waiting for students…</Text></View>
      ) : (
        <FlatList data={attendance} keyExtractor={item => item.id} renderItem={renderRosterItem} style={styles.rosterList} contentContainerStyle={{ paddingBottom: 40 }} />
      )}

      {/* MANUAL ENTRY MODAL */}
      <Modal visible={manualModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual Entry</Text>
              <TouchableOpacity onPress={() => setManualModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Students enrolled but not yet checked in.</Text>
            
            <ScrollView style={{ marginTop: 16 }}>
              {unmarkedStudents.length === 0 ? (
                <Text style={styles.emptyText}>All enrolled students are checked in.</Text>
              ) : (
                unmarkedStudents.map(student => (
                  <View key={student.id} style={styles.manualRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rosterName}>{student.full_name}</Text>
                      <Text style={styles.rosterEmail}>{student.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.markBtn} onPress={() => handleManualMark(student.id, 'present')}>
                      <Text style={styles.markBtnText}>Present</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ... Retain all previous styles from SessionControlScreen ... */
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#64748b', fontSize: 16 },
  header: { backgroundColor: '#1c625c', padding: 20, paddingTop: 48, paddingBottom: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  courseCode: { color: '#dcfce7', fontSize: 13, fontWeight: '700', letterSpacing: 1 },
  courseName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  roomText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, fontWeight: '500' },
  toggleBtn: { marginHorizontal: 16, marginTop: -24, padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  toggleBtnActive: { backgroundColor: '#e11d48' },
  toggleBtnInactive: { backgroundColor: '#059669' },
  toggleBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  qrSection: { alignItems: 'center', marginVertical: 20 },
  qrLabel: { fontSize: 13, color: '#64748b', marginBottom: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  qrContainer: { backgroundColor: '#fff', padding: 24, borderRadius: 24, elevation: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  rosterHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, marginTop: 16 },
  rosterTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
  manualBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#f1f5f9', borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' },
  manualBtnText: { fontSize: 12, fontWeight: '700', color: '#1c625c' },
  rosterList: { marginHorizontal: 16 },
  rosterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
  rosterLeft: { flex: 1 },
  rosterName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  rosterEmail: { fontSize: 13, color: '#64748b', marginTop: 2, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  emptyRoster: { margin: 16, padding: 32, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '500' },
  
  /* New Modal Styles */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  manualRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  markBtn: { backgroundColor: '#1c625c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  markBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' }
});