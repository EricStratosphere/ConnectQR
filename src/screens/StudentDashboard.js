import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

// ── Replace with your department Wi-Fi SSID ──────────────────────────────────
const DEPT_SSID = 'DeptWifi';

function useNetworkStatus() {
  const [status, setStatus] = useState({ isOnDeptWifi: false, ssid: null });

  useEffect(() => {
    const update = (state) => {
      const ssid = state.details?.ssid ?? null;
      setStatus({ isOnDeptWifi: ssid === DEPT_SSID, ssid });
    };
    const unsub = NetInfo.addEventListener(update);
    NetInfo.fetch().then(update);
    return unsub;
  }, []);

  return status;
}

export default function StudentDashboard({ navigation, profile }) {
  const [studentName, setStudentName]           = useState('');
  const [activeSession, setActiveSession]       = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentCheckins, setRecentCheckins]     = useState([]);
  const [loading, setLoading]                   = useState(true);

  const network = useNetworkStatus();

  const loadData = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }

    try {
      // 1. Full name from users table
      const { data: user } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', profile.id)
        .single();
      setStudentName(user?.full_name ?? 'Student');

      const now = new Date().toISOString();

      // 2. Currently active session (is_active = true)
      //    schedules → courses (course_code, course_name) → rooms (room_name)
      const { data: active } = await supabase
        .from('schedules')
        .select(`
          id, end_time,
          courses ( course_code, course_name ),
          rooms ( room_name )
        `)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      setActiveSession(active ?? null);

      // 3. Upcoming sessions (is_active false, start_time in future)
      const { data: upcoming } = await supabase
        .from('schedules')
        .select(`
          id, start_time, end_time,
          courses ( course_code, course_name ),
          rooms ( room_name )
        `)
        .eq('is_active', false)
        .gt('start_time', now)
        .order('start_time', { ascending: true })
        .limit(6);

      setUpcomingSessions(upcoming ?? []);

      // 4. Student's own check-ins from attendance_records
      //    attendance_records.student_id → attendance_records.session_id → schedules → courses
      const { data: checkins } = await supabase
        .from('attendance_records')
        .select(`
          id, status, timestamp,
          schedules (
            start_time,
            courses ( course_code, course_name )
          )
        `)
        .eq('student_id', profile.id)
        .order('timestamp', { ascending: false })
        .limit(3);

      setRecentCheckins(checkins ?? []);
    } catch (err) {
      console.error('StudentDashboard load error:', err);
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

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

  const formatDate = (iso) =>
    iso
      ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '—';

  const STATUS_CFG = {
    present: { label: 'Present', bg: '#dcfce7', text: '#166534' },
    late:    { label: 'Late',    bg: '#fff7ed', text: '#c2410c' },
    absent:  { label: 'Absent',  bg: '#fef2f2', text: '#b91c1c' },
  };

  const netOk = network.isOnDeptWifi;
  const netLabel = netOk
    ? 'Connected to Dept Wi-Fi'
    : network.ssid
    ? `Wrong network: ${network.ssid}`
    : 'Not on Dept Wi-Fi';

  const renderUpcoming = ({ item }) => (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingLeft}>
        <Text style={styles.upcomingCode}>{item.courses?.course_code ?? 'N/A'}</Text>
        <Text style={styles.upcomingName} numberOfLines={1}>
          {item.courses?.course_name ?? 'Unknown'}
        </Text>
        {item.rooms?.room_name ? (
          <Text style={styles.upcomingRoom}>
            <Ionicons name="location-outline" size={11} /> {item.rooms.room_name}
          </Text>
        ) : null}
      </View>
      <View style={styles.upcomingRight}>
        <Text style={styles.upcomingDate}>{formatDate(item.start_time)}</Text>
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
            {/* ── Header ── */}
            <View style={styles.header}>
              <View>
                <Text style={styles.greetingText}>
                  Hello, <Text style={styles.greetingName}>{studentName}</Text>
                </Text>
                <Text style={styles.greetingRole}>Student</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('StudentProfile', { studentId: profile?.id })}
              >
                <Ionicons name="person-circle-outline" size={38} color="#1c625c" />
              </TouchableOpacity>
            </View>

            {/* ── Network Status Pill ── */}
            <View style={[styles.netPill, netOk ? styles.netPillOk : styles.netPillWarn]}>
              <View style={[styles.netDot, netOk ? styles.netDotOk : styles.netDotWarn]} />
              <Text style={[styles.netText, netOk ? styles.netTextOk : styles.netTextWarn]}>
                {netLabel}
              </Text>
            </View>

            {/* ── Active Session Card ── */}
            {activeSession ? (
              <View style={styles.activeCard}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE NOW</Text>
                </View>
                <Text style={styles.activeCode}>
                  {activeSession.courses?.course_code} – {activeSession.courses?.course_name}
                </Text>
                {activeSession.rooms?.room_name ? (
                  <Text style={styles.activeRoom}>
                    <Ionicons name="location-outline" size={12} /> {activeSession.rooms.room_name}
                  </Text>
                ) : null}
                <Text style={styles.activeClosing}>
                  Closes at {formatTime(activeSession.end_time)}
                </Text>
                <TouchableOpacity
                  style={[styles.checkInBtn, !netOk && styles.checkInBtnDisabled]}
                  onPress={() => navigation.navigate('QRScanner', { studentId: profile?.id })}
                  disabled={!netOk}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={18}
                    color={netOk ? '#fff' : 'rgba(255,255,255,0.35)'}
                  />
                  <Text style={[styles.checkInText, !netOk && styles.checkInTextDisabled]}>
                    {netOk ? 'Scan QR to Check In' : 'Must be on Dept Wi-Fi'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noActiveCard}>
                <Ionicons name="time-outline" size={30} color="rgba(255,255,255,0.55)" />
                <Text style={styles.noActiveText}>No active class right now</Text>
                <Text style={styles.noActiveSubtext}>
                  Your instructor will open the attendance window when class begins.
                </Text>
              </View>
            )}

            {/* ── Standalone QR Scanner Button ── */}
            <TouchableOpacity
              style={[styles.bigScanBtn, !netOk && styles.bigScanBtnDisabled]}
              onPress={() => navigation.navigate('QRScanner', { studentId: profile?.id })}
              disabled={!netOk}
            >
              <Ionicons name="qr-code-outline" size={22} color={netOk ? '#fff' : '#94a3b8'} />
              <Text style={[styles.bigScanText, !netOk && styles.bigScanTextDisabled]}>
                Open QR Scanner
              </Text>
            </TouchableOpacity>

            {/* ── Recent Check-ins ── */}
            {recentCheckins.length > 0 && (
              <>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>Recent Check-ins</Text>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('AttendanceHistory', { studentId: profile?.id })
                    }
                  >
                    <Text style={styles.seeAll}>See all →</Text>
                  </TouchableOpacity>
                </View>
                {recentCheckins.map(r => {
                  const cfg = STATUS_CFG[r.status] ?? STATUS_CFG.absent;
                  return (
                    <View key={r.id} style={styles.recentRow}>
                      <View style={styles.recentLeft}>
                        <Text style={styles.recentCode}>
                          {r.schedules?.courses?.course_code ?? '—'}
                        </Text>
                        <Text style={styles.recentName} numberOfLines={1}>
                          {r.schedules?.courses?.course_name ?? 'Unknown'}
                        </Text>
                        <Text style={styles.recentTime}>
                          {formatDate(r.schedules?.start_time)}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* ── Upcoming section header ── */}
            <View style={[styles.rowBetween, { marginTop: 8 }]}>
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
  listContent: { paddingHorizontal: 22, paddingBottom: 36 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 42, marginBottom: 14,
  },
  greetingText: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  greetingName: { fontWeight: '400', fontStyle: 'italic' },
  greetingRole: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },

  netPill:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 14 },
  netPillOk:   { backgroundColor: '#f0fdf4' },
  netPillWarn: { backgroundColor: '#fff7ed' },
  netDot:      { width: 7, height: 7, borderRadius: 4 },
  netDotOk:    { backgroundColor: '#22c55e' },
  netDotWarn:  { backgroundColor: '#f97316' },
  netText:     { fontSize: 12, fontWeight: '600' },
  netTextOk:   { color: '#166534' },
  netTextWarn: { color: '#c2410c' },

  activeCard:  { backgroundColor: '#1c625c', borderRadius: 18, padding: 20, marginBottom: 12 },
  liveBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 10 },
  liveDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  liveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  activeCode:    { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  activeRoom:    { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4 },
  activeClosing: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginBottom: 16 },
  checkInBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24, paddingVertical: 11 },
  checkInBtnDisabled:  { backgroundColor: 'rgba(255,255,255,0.07)' },
  checkInText:         { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkInTextDisabled: { color: 'rgba(255,255,255,0.35)' },

  noActiveCard:    { backgroundColor: '#94a3b8', borderRadius: 18, padding: 22, marginBottom: 12, alignItems: 'center', gap: 6 },
  noActiveText:    { color: '#fff', fontSize: 15, fontWeight: '700' },
  noActiveSubtext: { color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  bigScanBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#1c625c', borderRadius: 14, padding: 15, marginBottom: 20 },
  bigScanBtnDisabled: { backgroundColor: '#e2e8f0' },
  bigScanText:        { color: '#fff', fontSize: 15, fontWeight: '700' },
  bigScanTextDisabled:{ color: '#94a3b8' },

  rowBetween:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll:       { fontSize: 12, fontWeight: '600', color: '#1c625c' },

  recentRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 },
  recentLeft:  { flex: 1 },
  recentCode:  { fontSize: 11, fontWeight: '700', color: '#1c625c', letterSpacing: 0.4 },
  recentName:  { fontSize: 13, fontWeight: '600', color: '#1e293b', marginTop: 1 },
  recentTime:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  upcomingCard:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, backgroundColor: '#fff', marginBottom: 10 },
  upcomingLeft:  { flex: 1, gap: 2 },
  upcomingCode:  { fontSize: 11, fontWeight: '700', color: '#1c625c', letterSpacing: 0.5 },
  upcomingName:  { fontSize: 13, fontWeight: '600', color: '#334155' },
  upcomingRoom:  { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  upcomingRight: { alignItems: 'flex-end', gap: 2 },
  upcomingDate:  { fontSize: 11, color: '#94a3b8' },
  upcomingTime:  { fontSize: 13, fontWeight: '700', color: '#1e293b' },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  emptyText:  { color: '#94a3b8', fontSize: 14 },
});