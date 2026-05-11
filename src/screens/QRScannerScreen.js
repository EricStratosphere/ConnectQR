import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { checkInWithQR } from '../lib/supabase';

const RESULT_CONFIG = {
  present:   { color: '#22c55e', icon: '✓', label: 'Present' },
  late:      { color: '#f59e0b', icon: '⏰', label: 'Late' },
  invalid:   { color: '#ef4444', icon: '✗', label: 'Invalid QR' },
  expired:   { color: '#ef4444', icon: '✗', label: 'Session Closed' },
  duplicate: { color: '#6366f1', icon: '✓', label: 'Already Checked In' },
  error:     { color: '#ef4444', icon: '!', label: 'Error' },
};

export default function QRScannerScreen({ route }) {
  const { studentId } = route?.params ?? {};
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning]         = useState(true);
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState(null);
  const lastScanned                     = useRef('');

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator /></View>;
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
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Verifying attendance…</Text>
      </View>
    );
  }

  if (result) {
    const cfg = RESULT_CONFIG[result.status] ?? RESULT_CONFIG.error;
    return (
      <View style={[styles.center, { backgroundColor: cfg.color + '15' }]}>
        <View style={[styles.resultCard, { borderColor: cfg.color }]}>
          <Text style={[styles.resultIcon, { color: cfg.color }]}>{cfg.icon}</Text>
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

const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#f8fafc' },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', paddingTop: 60, paddingHorizontal: 24,
  },
  overlayTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 8 },
  overlaySubtitle: { color: 'rgba(255,255,255,0.75)', fontSize: 14, textAlign: 'center', marginBottom: 32 },
  viewfinderContainer: { width: 260, height: 260, justifyContent: 'center', alignItems: 'center' },
  viewfinder: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: '#6366f1' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  scanHint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 20 },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 2,
    padding: 32, alignItems: 'center', width: '100%', marginBottom: 24,
    elevation: 4,
  },
  resultIcon: { fontSize: 56, marginBottom: 8 },
  resultLabel: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  resultMessage: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22 },
  sessionInfo: {
    marginTop: 16, backgroundColor: '#f1f5f9',
    borderRadius: 8, padding: 12, width: '100%', gap: 4,
  },
  sessionText: { fontSize: 13, color: '#475569' },
  permText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  loadingText: { marginTop: 16, color: '#64748b', fontSize: 15 },
  btn: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});