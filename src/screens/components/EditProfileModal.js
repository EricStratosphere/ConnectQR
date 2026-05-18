import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EditProfileModal({ visible, onClose, onSubmit, loading, profileData }) {
  const [fullName, setFullName] = useState('');

  // When the modal opens or profile data changes, pre-fill the name
  useEffect(() => {
    if (profileData) {
      setFullName(profileData.full_name || '');
    }
  }, [profileData, visible]);

  const handleSubmit = () => {
    // Only submitting the data that exists in the database
    onSubmit({ fullName });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput 
              style={styles.input} 
              value={fullName} 
              onChangeText={setFullName} 
              placeholder="e.g. Juan D. Cruz" 
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Changes</Text>}
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
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#1c625c', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 14, fontSize: 15, color: '#1e293b' },
  submitBtn: { backgroundColor: '#1c625c', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});