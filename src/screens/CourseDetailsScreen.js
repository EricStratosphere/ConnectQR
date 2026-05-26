import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, Modal } from 'react-native';
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
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingEnrolled, setLoadingEnrolled] = useState(true);

  // ── Enrollment Modal State ────────────────────────────────────────────────
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoadingRisk(true);
      setLoadingSessions(true);
      setLoadingEnrolled(true);

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

      const loadEnrolledStudents = async () => {
        try {
          const { data, error } = await supabase
            .from('enrollments')
            .select('student_id, users ( id, full_name, email )')
            .eq('course_id', course.id);
          if (!error && data) {
            setEnrolledStudents(data.map(e => e.users).filter(Boolean));
          }
        } catch (err) {
          console.log(err);
        } finally {
          setLoadingEnrolled(false);
        }
      };

      loadReports();
      loadSessionsHistory();
      loadEnrolledStudents();
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

  // ── Enrollment Handlers ───────────────────────────────────────────────────

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      // Search users by name or email who are students and not already enrolled
      const enrolledIds = enrolledStudents.map(s => s.id);

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'student')
        .or(`full_name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
        .limit(10);

      if (!error && data) {
        // Filter out already enrolled students client-side
        const filtered = data.filter(u => !enrolledIds.includes(u.id));
        setSearchResults(filtered);
      }
    } catch (err) {
      console.log(err);
    } finally {
      setSearching(false);
    }
  };

  const handleEnrollStudent = async (student) => {
    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({ course_id: course.id, student_id: student.id });

      if (error) {
        if (error.code === '23505') throw new Error('Student is already enrolled.');
        throw error;
      }

      // Update local state immediately
      setEnrolledStudents(prev => [...prev, student]);
      setSearchResults(prev => prev.filter(u => u.id !== student.id));
      Alert.alert('Enrolled', `${student.full_name} has been added to the course.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemoveStudent = (student) => {
    Alert.alert(
      'Remove Student',
      `Remove ${student.full_name} from this course?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('enrollments')
                .delete()
                .eq('course_id', course.id)
                .eq('student_id', student.id);
              if (error) throw error;
              setEnrolledStudents(prev => prev.filter(s => s.id !== student.id));
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          }
        }
      ]
    );
  };

  const openEnrollModal = () => {
    setSearchQuery('');
    setSearchResults([]);
    setEnrollModalVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      {/* ── Course Information ─────────────────────────────────────────────── */}
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

      {/* ── Enrolled Students ──────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.sectionTitle}>Enrolled Students</Text>
            <Text style={styles.enrollCount}>{enrolledStudents.length} student{enrolledStudents.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.enrollBtn} onPress={openEnrollModal}>
            <Ionicons name="person-add-outline" size={16} color="#fff" />
            <Text style={styles.enrollBtnText}>Add Student</Text>
          </TouchableOpacity>
        </View>

        {loadingEnrolled ? (
          <ActivityIndicator color="#1c625c" style={{ marginTop: 16 }} />
        ) : enrolledStudents.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={32} color="#cbd5e1" />
            <Text style={styles.emptyText}>No students enrolled yet.</Text>
            <Text style={styles.emptySubText}>Tap "Add Student" to search and enroll students.</Text>
          </View>
        ) : (
          enrolledStudents.map((student) => (
            <View key={student.id} style={styles.studentRow}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {student.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName}>{student.full_name}</Text>
                <Text style={styles.studentEmail}>{student.email}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveStudent(student)} style={styles.removeBtn}>
                <Ionicons name="person-remove-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* ── Session History ────────────────────────────────────────────────── */}
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
                  {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

      {/* ── At-Risk Students ───────────────────────────────────────────────── */}
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

      {/* ── Enroll Student Modal ───────────────────────────────────────────── */}
      <Modal visible={enrollModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Student</Text>
                <Text style={styles.modalSubtitle}>Search by name or email</Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search students..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              {searching && <ActivityIndicator size="small" color="#1c625c" />}
            </View>

            <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
              {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="person-outline" size={28} color="#cbd5e1" />
                  <Text style={styles.noResultsText}>No students found matching "{searchQuery}"</Text>
                </View>
              )}

              {searchResults.map(user => (
                <View key={user.id} style={styles.searchResultRow}>
                  <View style={styles.resultAvatar}>
                    <Text style={styles.resultAvatarText}>
                      {user.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{user.full_name}</Text>
                    <Text style={styles.resultEmail}>{user.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleEnrollStudent(user)}
                    disabled={enrolling}
                  >
                    {enrolling
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.addBtnText}>Enroll</Text>
                    }
                  </TouchableOpacity>
                </View>
              ))}

              {/* Already enrolled list at the bottom for reference */}
              {enrolledStudents.length > 0 && (
                <>
                  <Text style={styles.alreadyEnrolledLabel}>
                    Already enrolled ({enrolledStudents.length})
                  </Text>
                  {enrolledStudents.map(s => (
                    <View key={s.id} style={[styles.searchResultRow, styles.enrolledRowDim]}>
                      <View style={[styles.resultAvatar, { backgroundColor: '#e2e8f0' }]}>
                        <Text style={[styles.resultAvatarText, { color: '#94a3b8' }]}>
                          {s.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultName, { color: '#94a3b8' }]}>{s.full_name}</Text>
                        <Text style={styles.resultEmail}>{s.email}</Text>
                      </View>
                      <View style={styles.enrolledBadge}>
                        <Ionicons name="checkmark" size={12} color="#059669" />
                        <Text style={styles.enrolledBadgeText}>Enrolled</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0eff4', padding: 16 },

  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  enrollCount: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },

  displayCode: { fontSize: 18, fontWeight: '800', color: '#1c625c' },
  displayName: { fontSize: 15, color: '#475569', marginTop: 4 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 12, fontSize: 15, color: '#1e293b' },
  saveBtn: { backgroundColor: '#1c625c', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  // Enrolled students
  enrollBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1c625c', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  enrollBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  studentAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center' },
  studentAvatarText: { fontSize: 15, fontWeight: '700', color: '#059669' },
  studentName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  studentEmail: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  removeBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 8 },

  // Sessions
  sessionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  sessionLeft: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  sessionTime: { fontSize: 12, color: '#64748b', marginTop: 2 },
  sessionRight: { alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  sessionCount: { fontSize: 16, fontWeight: '800', color: '#1c625c' },
  sessionCountLabel: { fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginTop: 2 },

  // Export / At-Risk
  exportRow: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: 10 },
  exportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 10, padding: 12 },
  exportBtnText: { color: '#1c625c', fontWeight: '600', fontSize: 13 },
  riskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 12, marginTop: 10 },
  riskName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  riskMeta: { fontSize: 12, color: '#ea580c', marginTop: 2, fontWeight: '500' },
  riskBadge: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  riskBadgeText: { fontSize: 10, fontWeight: '700', color: '#ea580c' },

  // Empty states
  empty: { alignItems: 'center', padding: 20, gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '500', color: '#94a3b8' },
  emptySubText: { fontSize: 12, color: '#cbd5e1', textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  modalSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  modalCloseBtn: { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#1e293b', padding: 0 },
  searchResults: { maxHeight: 420 },

  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  enrolledRowDim: { opacity: 0.65 },
  resultAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  resultAvatarText: { fontSize: 16, fontWeight: '700', color: '#3b82f6' },
  resultName: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  resultEmail: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  addBtn: { backgroundColor: '#1c625c', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, minWidth: 60, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  enrolledBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  enrolledBadgeText: { fontSize: 12, fontWeight: '600', color: '#059669' },

  alreadyEnrolledLabel: { fontSize: 11, fontWeight: '700', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },

  noResults: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  noResultsText: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});