import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { exportToCSV, exportToPDF } from './utils/exportUtils';

export default function CourseDetailsScreen({ route, navigation }) {
  const { course } = route.params;
  
  const [courseCode, setCourseCode] = useState(course.course_code);
  const [courseName, setCourseName] = useState(course.course_name);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [courseSessions, setCourseSessions] = useState([]);
  
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // FIX: useFocusEffect ensures data refetches EVERY time you open this screen
  useFocusEffect(
    useCallback(() => {
      setLoadingRisk(true);
      setLoadingSessions(true);

      const loadReports = async () => {
        try {
          const { data, error } = await supabase
            .from('attendance_summary')
            .select('full_name, absences, attendance_pct')
            .eq('course_code', course.course_code)
            .lt('attendance_pct', 80)
            .order('attendance_pct', { ascending: true });

          if (!error) setAtRiskStudents(data ?? []);
        } catch (err) {
          console.log(err);
        } finally {
          setLoadingRisk(false);
        }
      };

      const loadSessionsHistory = async () => {
        try {
          const { data, error } = await supabase
            .from('schedules')
            .select(`
              id, start_time, end_time, is_active,
              attendance_records ( id )
            `)
            .eq('course_id', course.id)
            .order('start_time', { ascending: false });
          
          if (!error && data) {
            const formatted = data.map(s => ({
              ...s,
              attendance_count: s.attendance_records?.length || 0 
            }));
            setCourseSessions(formatted);
          }
        } catch (err) {
          console.log(err);
        } finally {
          setLoadingSessions(false);
        }
      };

      loadReports();
      loadSessionsHistory();
    }, [course.course_code, course.id])
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ course_code: courseCode, course_name: courseName })
        .eq('id', course.id);

      if (error) throw error;
      Alert.alert('Success', 'Course updated!');
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const dataToExport = atRiskStudents.map(student => ({
        Name: student.full_name,
        Absences: student.absences,
        Attendance_Rate: `${student.attendance_pct}%`
      }));
      if (format === 'CSV') await exportToCSV(dataToExport, `${courseCode}_report.csv`);
      if (format === 'PDF') await exportToPDF(dataToExport, `${courseCode}_report`);
    } catch (error) {
      Alert.alert('Export Error', 'Failed to generate file.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Edit Course Section */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Course Information</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Ionicons name={isEditing ? "close" : "pencil"} size={20} color="#1c625c" />
          </TouchableOpacity>
        </View>

        {isEditing ? (
          <View>
            <Text style={styles.label}>Course Code</Text>
            <TextInput style={styles.input} value={courseCode} onChangeText={setCourseCode} />
            <Text style={styles.label}>Course Name</Text>
            <TextInput style={styles.input} value={courseName} onChangeText={setCourseName} />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.displayCode}>{courseCode}</Text>
            <Text style={styles.displayName}>{courseName}</Text>
          </View>
        )}
      </View>

      {/* Session History Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Session History</Text>
        
        {loadingSessions ? (
          <ActivityIndicator color="#1c625c" style={{ marginTop: 16 }} />
        ) : courseSessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No sessions scheduled yet.</Text>
          </View>
        ) : (
          courseSessions.map((session, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.sessionCard}
              onPress={() => navigation.navigate('SessionControl', { sessionId: session.id })}
            >
              <View style={styles.sessionLeft}>
                <Text style={styles.sessionDate}>
                  {new Date(session.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </Text>
                <Text style={styles.sessionTime}>
                  {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.sessionRight}>
                <Text style={styles.sessionCount}>{session.attendance_count}</Text>
                <Text style={styles.sessionCountLabel}>Attended</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Reports Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>At-Risk Students</Text>
        
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

        {loadingRisk ? (
          <ActivityIndicator color="#1c625c" style={{ marginTop: 16 }} />
        ) : atRiskStudents.length === 0 ? (
          <View style={[styles.empty, { marginTop: 10 }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color="#22c55e" />
            <Text style={[styles.emptyText, { color: '#22c55e' }]}>No at-risk students.</Text>
          </View>
        ) : (
          atRiskStudents.map((s, i) => (
            <View key={i} style={styles.riskCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.riskName}>{s.full_name}</Text>
                <Text style={styles.riskMeta}>{s.absences} absences · {s.attendance_pct}% attended</Text>
              </View>
              <View style={styles.riskBadge}>
                <Text style={styles.riskBadgeText}>AT RISK</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eff4', padding: 16 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  displayCode: { fontSize: 18, fontWeight: '800', color: '#1c625c' },
  displayName: { fontSize: 15, color: '#475569', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#1c625c', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  
  sessionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sessionLeft: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  sessionTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sessionRight: { alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sessionCount: { fontSize: 16, fontWeight: '800', color: '#1c625c' },
  sessionCountLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: 2 },

  exportRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 10, padding: 12 },
  exportBtnText: { color: '#1c625c', fontWeight: '600', fontSize: 13 },
  riskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 12, marginTop: 10 },
  riskName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  riskMeta: { fontSize: 12, color: '#ea580c', marginTop: 2, fontWeight: '500' },
  riskBadge: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  riskBadgeText: { fontSize: 10, fontWeight: '700', color: '#ea580c' },
  empty: { alignItems: 'center', padding: 20, gap: 8 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#94a3b8' }
});