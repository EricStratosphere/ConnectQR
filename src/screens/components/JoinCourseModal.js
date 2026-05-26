import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ActivityIndicator, FlatList, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function JoinCourseModal({ visible, onClose, onSubmit, loading, studentId }) {
  const [query, setQuery]             = useState('');
  const [allCourses, setAllCourses]   = useState([]);
  const [filtered, setFiltered]       = useState([]);
  const [fetching, setFetching]       = useState(false);
  const [selected, setSelected]       = useState(null);
  const [enrolledIds, setEnrolledIds] = useState([]);

  // Fetch all available courses + student's current enrollments when modal opens
  const fetchData = useCallback(async () => {
    if (!visible) return;
    setFetching(true);
    try {
      const [coursesRes, enrollRes] = await Promise.all([
        supabase
          .from('courses')
          .select('id, course_code, course_name, users ( full_name )')
          .order('course_code', { ascending: true }),
        studentId
          ? supabase
              .from('enrollments')
              .select('course_id')
              .eq('student_id', studentId)
          : Promise.resolve({ data: [] }),
      ]);

      const enrolled = (enrollRes.data ?? []).map(e => e.course_id);
      setEnrolledIds(enrolled);

      const courses = (coursesRes.data ?? []).map(c => ({
        id: c.id,
        course_code: c.course_code,
        course_name: c.course_name,
        instructor: c.users?.full_name ?? 'Instructor',
        isEnrolled: enrolled.includes(c.id),
      }));

      setAllCourses(courses);
      setFiltered(courses);
    } catch (err) {
      console.error('JoinCourseModal fetch error:', err);
    } finally {
      setFetching(false);
    }
  }, [visible, studentId]);

  useEffect(() => {
    if (visible) {
      setQuery('');
      setSelected(null);
      fetchData();
    }
  }, [visible, fetchData]);

  // Live search filter (Suggests courses as the user types)
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered(allCourses);
    } else {
      setFiltered(
        allCourses.filter(
          c =>
            c.course_code.toLowerCase().includes(q) ||
            c.course_name.toLowerCase().includes(q) ||
            c.instructor.toLowerCase().includes(q)
        )
      );
    }
  }, [query, allCourses]);

  const handleSelect = (course) => {
    if (course.isEnrolled) return; // can't pick already-enrolled
    setSelected(prev => (prev?.id === course.id ? null : course));
  };

  const handleSubmit = () => {
    if (!selected || loading) return;
    onSubmit(selected);
  };

  const renderCourse = ({ item }) => {
    const isSelected = selected?.id === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.courseRow,
          item.isEnrolled && styles.courseRowEnrolled,
          isSelected && styles.courseRowSelected,
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={item.isEnrolled ? 1 : 0.7}
      >
        <View style={[styles.courseIcon, isSelected && styles.courseIconSelected]}>
          <Text style={[styles.courseIconText, isSelected && { color: '#fff' }]}>
            {item.course_code.slice(0, 2)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.courseTopRow}>
            <Text style={[styles.courseCode, item.isEnrolled && styles.dimText]}>
              {item.course_code}
            </Text>
            {item.isEnrolled && (
              <View style={styles.enrolledPill}>
                <Ionicons name="checkmark" size={10} color="#059669" />
                <Text style={styles.enrolledPillText}>Enrolled</Text>
              </View>
            )}
          </View>
          <Text style={[styles.courseName, item.isEnrolled && styles.dimText]} numberOfLines={1}>
            {item.course_name}
          </Text>
          <Text style={styles.instructorText}>
            <Ionicons name="person-outline" size={10} /> {item.instructor}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Join a Course</Text>
              <Text style={styles.subtitle}>Search and select a course to enroll in</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color="#94a3b8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by code, name, or instructor..."
              placeholderTextColor="#cbd5e1"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={17} color="#cbd5e1" />
              </TouchableOpacity>
            )}
          </View>

          {/* Course List */}
          {fetching ? (
            <View style={styles.center}>
              <ActivityIndicator color="#1c625c" />
              <Text style={styles.loadingText}>Loading courses...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="book-outline" size={32} color="#cbd5e1" />
              <Text style={styles.emptyText}>
                {query ? `No courses matching "${query}"` : 'No courses available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={item => item.id}
              renderItem={renderCourse}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Selected Course Preview + Enroll Button */}
          {selected && (
            <View style={styles.selectedPreview}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedLabel}>Selected</Text>
                <Text style={styles.selectedName} numberOfLines={1}>
                  {selected.course_code} — {selected.course_name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.enrollBtn}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.enrollBtnText}>Enroll</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:  { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, maxHeight: '82%' },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  title:      { fontSize: 20, fontWeight: '800', color: '#1e293b' },
  subtitle:   { fontSize: 13, color: '#94a3b8', marginTop: 3, marginRight: 16 },
  closeBtn:   { padding: 4, backgroundColor: '#f1f5f9', borderRadius: 20 },

  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14 },
  searchInput:{ flex: 1, fontSize: 14, color: '#1e293b', padding: 0 },

  list:       { flexGrow: 0, maxHeight: 340 },

  courseRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: 'transparent' },
  courseRowEnrolled: { opacity: 0.55 },
  courseRowSelected: { borderColor: '#1c625c', backgroundColor: '#f0fdf9' },

  courseIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  courseIconSelected: { backgroundColor: '#1c625c' },
  courseIconText: { fontSize: 12, fontWeight: '800', color: '#64748b' },

  courseTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  courseCode:     { fontSize: 13, fontWeight: '800', color: '#1c625c', letterSpacing: 0.3 },
  courseName:     { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  instructorText: { fontSize: 11, color: '#94a3b8', marginTop: 3, fontWeight: '500' },
  dimText:        { color: '#94a3b8' },

  enrolledPill:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#f0fdf4', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' },
  enrolledPillText: { fontSize: 10, fontWeight: '700', color: '#059669' },

  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1c625c', justifyContent: 'center', alignItems: 'center' },

  center:      { alignItems: 'center', paddingVertical: 32, gap: 10 },
  loadingText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  emptyText:   { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  selectedPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf9', borderWidth: 1.5, borderColor: '#1c625c', borderRadius: 14, padding: 14, marginTop: 12 },
  selectedLabel:   { fontSize: 10, fontWeight: '700', color: '#1c625c', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  selectedName:    { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  enrollBtn:       { backgroundColor: '#1c625c', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  enrollBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});