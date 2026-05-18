import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddSessionModal({ visible, onClose, onSubmit, loading, courses, rooms }) {
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedRoomId, setSelectedRoomId]     = useState(null); 
  
  const [sessionDate, setSessionDate] = useState(new Date());
  const [startTime, setStartTime]   = useState(new Date());
  const [endTime, setEndTime]       = useState(new Date(new Date().getTime() + 60 * 60 * 1000));

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerTarget, setPickerTarget] = useState('');

  const openPicker = (target, mode) => {
    setPickerTarget(target);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handlePickerChange = (event, selectedValue) => {
    if (Platform.OS === 'android') setShowPicker(false);
    
    if (selectedValue) {
      if (pickerTarget === 'date') setSessionDate(selectedValue);
      else if (pickerTarget === 'start') setStartTime(selectedValue);
      else if (pickerTarget === 'end') setEndTime(selectedValue);
    }
  };

  const handleSubmit = () => {
    if (!selectedCourseId) {
      Alert.alert('Missing Info', 'Please select a course.');
      return;
    }
    if (!selectedRoomId) {
      Alert.alert('Missing Info', 'Please assign a room for this session.');
      return;
    }

    const year  = sessionDate.getFullYear();
    const month = sessionDate.getMonth();
    const day   = sessionDate.getDate();

    const finalStart = new Date(year, month, day, startTime.getHours(), startTime.getMinutes());
    const finalEnd   = new Date(year, month, day, endTime.getHours(), endTime.getMinutes());

    if (finalStart >= finalEnd) {
      Alert.alert('Error', 'End time must be after start time.');
      return;
    }

    // NEW: Passed the roomId back to the dashboard
    onSubmit({
      courseId: selectedCourseId,
      roomId: selectedRoomId, 
      startTime: finalStart.toISOString(),
      endTime: finalEnd.toISOString(),
    });

    // Reset Form
    setSelectedCourseId(null);
    setSelectedRoomId(null);
    setSessionDate(new Date());
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (time) => time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Schedule Session</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* COURSE SELECTOR */}
          <Text style={styles.label}>Select Course</Text>
          <ScrollView style={styles.horizontalList} horizontal showsHorizontalScrollIndicator={false}>
            {courses?.length === 0 && <Text style={styles.emptyText}>Register to a course first.</Text>}
            {courses?.map(course => (
              <TouchableOpacity 
                key={course.id} 
                style={[styles.pill, selectedCourseId === course.id && styles.pillActive]}
                onPress={() => setSelectedCourseId(course.id)}
              >
                <Text style={[styles.pillText, selectedCourseId === course.id && styles.pillTextActive]}>
                  {course.course_code}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ROOM SELECTOR (NEW) */}
          <Text style={styles.label}>Assign Room</Text>
          <ScrollView style={styles.horizontalList} horizontal showsHorizontalScrollIndicator={false}>
            {rooms?.length === 0 && <Text style={styles.emptyText}>No rooms available in database.</Text>}
            {rooms?.map(room => (
              <TouchableOpacity 
                key={room.id} 
                style={[styles.pill, selectedRoomId === room.id && styles.pillActive]}
                onPress={() => setSelectedRoomId(room.id)}
              >
                <Text style={[styles.pillText, selectedRoomId === room.id && styles.pillTextActive]}>
                  {room.room_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('date', 'date')}>
              <Ionicons name="calendar-outline" size={20} color="#1c625c" style={styles.inputIcon} />
              <Text style={styles.pickerText}>{formatDate(sessionDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Start Time</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('start', 'time')}>
                <Ionicons name="time-outline" size={20} color="#1c625c" style={styles.inputIcon} />
                <Text style={styles.pickerText}>{formatTime(startTime)}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>End Time</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => openPicker('end', 'time')}>
                <Ionicons name="time-outline" size={20} color="#1c625c" style={styles.inputIcon} />
                <Text style={styles.pickerText}>{formatTime(endTime)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showPicker && (
            <DateTimePicker
              value={pickerTarget === 'date' ? sessionDate : pickerTarget === 'start' ? startTime : endTime}
              mode={pickerMode}
              display="default"
              onChange={handlePickerChange}
              textColor="#1e293b"
            />
          )}

          {showPicker && Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.iosDoneBtn} onPress={() => setShowPicker(false)}>
              <Text style={styles.iosDoneText}>Confirm Date/Time</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Session</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  label: { fontSize: 13, fontWeight: '600', color: '#1c625c', marginBottom: 6 },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  
  horizontalList: { flexDirection: 'row', marginBottom: 20, flexGrow: 0 },
  pill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  pillActive: { backgroundColor: '#1c625c', borderColor: '#1c625c' },
  pillText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },

  pickerButton: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, 
    padding: 14, backgroundColor: '#f8fafc'
  },
  inputIcon: { marginRight: 8 },
  pickerText: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  
  iosDoneBtn: { alignSelf: 'flex-end', marginBottom: 16 },
  iosDoneText: { color: '#1c625c', fontWeight: '700', fontSize: 16 },

  submitBtn: { backgroundColor: '#1c625c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});