import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, ScrollView, Alert, Platform, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function AddSessionModal({ visible, onClose, onSubmit, loading, courses, rooms }) {
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedRoomId, setSelectedRoomId]     = useState(null);
  
  // NEW UI STATES: Exclusive Network Option (Backend logic to be handled later)
  const [isNetworkRestricted, setIsNetworkRestricted] = useState(false);
  const [networkIp, setNetworkIp]                     = useState('');

  const [sessionDate, setSessionDate] = useState(new Date());
  const [startTime, setStartTime]   = useState(new Date());
  const [endTime, setEndTime]       = useState(new Date(new Date().getTime() + 60 * 60 * 1000));

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerTarget, setPickerTarget] = useState('');

  useEffect(() => {
    const selectedRoom = rooms?.find(room => room.id === selectedRoomId);
    setNetworkIp(selectedRoom?.allowed_ip ?? '');
  }, [rooms, selectedRoomId]);

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
    if (isNetworkRestricted && !networkIp.trim()) {
      Alert.alert('Missing Info', 'Please enter a Network IP/Gateway or turn off the network lock.');
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

    // Passing the data through; you can handle this column in the backend later
    onSubmit({
      courseId: selectedCourseId,
      roomId: selectedRoomId, 
      startTime: finalStart.toISOString(),
      endTime: finalEnd.toISOString(),
      allowedIp: isNetworkRestricted ? networkIp.trim() : null,
    });

    // Reset Form
    setSelectedCourseId(null);
    setSelectedRoomId(null);
    setIsNetworkRestricted(false);
    setNetworkIp('');
    setSessionDate(new Date());
  };

  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (time) => time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
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

            {/* ROOM SELECTOR */}
            <Text style={styles.label}>Assign Room</Text>
            <ScrollView style={styles.horizontalList} horizontal showsHorizontalScrollIndicator={false}>
              {rooms?.length === 0 && <Text style={styles.emptyText}>No rooms available in database.</Text>}
              {rooms?.map(room => (
                <TouchableOpacity 
                  key={room.id} 
                  style={[styles.pill, selectedRoomId === room.id && styles.pillActive]}
                  onPress={() => setSelectedRoomId(room.id)}
                >
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.pillText, selectedRoomId === room.id && styles.pillTextActive]}>
                      {room.room_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* NEW UI: EXCLUSIVE NETWORK TOGGLE */}
            <View style={styles.networkToggleRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.networkLabel}>Add Exclusive Network</Text>
                <Text style={styles.networkSublabel}>Restrict check-ins to a specific gateway network</Text>
              </View>
              <Switch
                trackColor={{ false: '#cbd5e1', true: '#1c625c' }}
                thumbColor={isNetworkRestricted ? '#fff' : '#f4f3f4'}
                onValueChange={setIsNetworkRestricted}
                value={isNetworkRestricted}
              />
            </View>

            {/* NEW UI: NETWORK TEXT INPUT FIELDS */}
            {isNetworkRestricted && (
              <View style={styles.networkInputGroup}>
                <Text style={styles.label}>Allowed IP Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 192.168.1.1"
                  placeholderTextColor="#94a3b8"
                  value={networkIp}
                  onChangeText={setNetworkIp}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            )}

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

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Session</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  label: { fontSize: 13, fontWeight: '600', color: '#1c625c', marginBottom: 6 },
  inputGroup: { marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  horizontalList: { flexDirection: 'row', marginBottom: 20, flexGrow: 0 },
  pill: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 10, borderWidth: 1, borderColor: '#cbd5e1', justifyContent: 'center' },
  pillActive: { backgroundColor: '#1c625c', borderColor: '#1c625c' },
  pillText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  emptyText: { color: '#94a3b8', fontStyle: 'italic', fontSize: 13 },
  
  // Network Options Styles
  networkToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, marginTop: 4 },
  networkLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  networkSublabel: { fontSize: 11, color: '#64748b', marginTop: 2, lineHeight: 16 },
  networkInputGroup: { marginBottom: 18 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, fontSize: 14, color: '#1e293b', backgroundColor: '#f8fafc' },

  pickerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, backgroundColor: '#f8fafc' },
  inputIcon: { marginRight: 8 },
  pickerText: { fontSize: 15, color: '#1e293b', fontWeight: '500' },
  submitBtn: { backgroundColor: '#1c625c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});