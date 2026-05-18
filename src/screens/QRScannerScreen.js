import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkInWithQR } from '../lib/supabase';

// UPDATED: Softer, professional colors matching the new theme
const RESULT_CONFIG = {
  present:   { color: '#059669', icon: '✓', label: 'Present' }, // Deep Emerald
  late:      { color: '#d97706', icon: '⏰', label: 'Late' },    // Muted Amber
  invalid:   { color: '#e11d48', icon: '✗', label: 'Invalid QR' }, // Soft Rose
  expired:   { color: '#e11d48', icon: '✗', label: 'Session Closed' },
  duplicate: { color: '#1c625c', icon: '✓', label: 'Already Checked In' }, // Theme Teal
  error:     { color: '#e11d48', icon: '!', label: 'Error' },
};

export default function QRScannerScreen({ route }) {
  const { studentId } = route?.params ?? {};
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const lastScanned                     = useRef('');

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color="#1c625c" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is required to scan QR codes.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }) => {
    if (!scanning || loading || data === lastScanned.current) return;
    lastScanned.current = data;
    Vibration.vibrate(100);
    setScanning(false);
    setLoading(true);
    setResult(null);

    try {
      const checkInResult = await checkInWithQR(data, studentId);
      setResult(checkInResult);
    } catch (err) {
      setResult({ success: false, status: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setLoading(false);
    lastScanned.current = '';
    setTimeout(() => setScanning(true), 300);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1c625c" />
        <Text style={styles.loadingText}>Verifying attendance…</Text>
      </View>
    );
  }

  if (result) {
    const cfg = RESULT_CONFIG[result.status] ?? RESULT_CONFIG.error;
    return (
      <View style={[styles.center, { backgroundColor: cfg.color + '10' }]}>
        <View style={[styles.resultCard, { borderColor: cfg.color }]}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.color + '20' }]}>
            <Text style={[styles.resultIcon, { color: cfg.color }]}>{cfg.icon}</Text>
          </View>
          <Text style={[styles.resultLabel, { color: cfg.color }]}>{cfg.label}</Text>
          <Text style={styles.resultMessage}>{result.message}</Text>

          {result.session && (
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionText}>
                📚 {result.session.courses?.course_code} — {result.session.courses?.course_name}
              </Text>
              <Text style={styles.sessionText}>
                📍 {result.session.rooms?.room_name}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.btn} onPress={resetScanner}>
          <Text style={styles.btnText}>Scan Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Scan QR Code</Text>
        <Text style={styles.overlaySubtitle}>
          Point your camera at the QR code shown by your instructor
        </Text>

        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        <Text style={styles.scanHint}>{scanning ? 'Ready to scan…' : 'Processing…'}</Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center', paddingTop: 80, paddingHorizontal: 24,
  },
  overlayTitle: { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  overlaySubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', marginBottom: 48, fontWeight: '500' },
  viewfinderContainer: { width: 280, height: 280, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { width: 260, height: 260, position: 'relative' },
  
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#1c625c' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderTopLeftRadius: 16 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderTopRightRadius: 16 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH, borderBottomLeftRadius: 16 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH, borderBottomRightRadius: 16 },
  
  scanHint: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 40, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  
  resultCard: {
    backgroundColor: '#fff', borderRadius: 24, borderWidth: 2,
    padding: 32, alignItems: 'center', width: '100%', marginBottom: 32,
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24,
  },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resultIcon: { fontSize: 40, fontWeight: '800' },
  resultLabel: { fontSize: 22, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultMessage: { fontSize: 15, color: '#475569', textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  sessionInfo: {
    marginTop: 24, backgroundColor: '#f8fafc',
    borderRadius: 16, padding: 16, width: '100%', gap: 8,
    borderWidth: 1, borderColor: '#e2e8f0'
  },
  sessionText: { fontSize: 14, color: '#334155', fontWeight: '600' },
  
  permText: { fontSize: 16, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 24, fontWeight: '500' },
  loadingText: { marginTop: 24, color: '#1c625c', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  
  btn: { backgroundColor: '#1c625c', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5, textTransform: 'uppercase' },
});