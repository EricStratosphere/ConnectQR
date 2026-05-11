import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { supabase, signOut } from '../lib/supabase';

export default function InstructorDashboard({ navigation, profile }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select(`
          id, is_active, start_time, end_time,
          courses!inner ( course_name, course_code, instructor_id ),
          rooms ( room_name )
        `)
        .eq('courses.instructor_id', profile?.id)
        .order('start_time', { ascending: false })
        .limit(20);

      if (!error) setSessions(data ?? []);
      setLoading(false);
    };
    if (profile?.id) load();
  }, [profile?.id]);

  const renderSession = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SessionControl', { sessionId: item.id })}
    >
      <View style={styles.cardLeft}>
        <Text style={styles.cardCode}>{item.courses?.course_code}</Text>
        <Text style={styles.cardName}>{item.courses?.course_name}</Text>
        <Text style={styles.cardRoom}>📍 {item.rooms?.room_name}</Text>
      </View>
      <View style={[styles.activeBadge, item.is_active ? styles.badgeOn : styles.badgeOff]}>
        <Text style={[styles.badgeText, item.is_active ? styles.badgeTextOn : styles.badgeTextOff]}>
          {item.is_active ? 'LIVE' : 'CLOSED'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {profile?.full_name ?? 'Instructor'} 👋</Text>
        <Text style={styles.role}>Instructor</Text>
      </View>

      <Text style={styles.sectionTitle}>Your Sessions</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#6366f1" />
      ) : sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sessions found. Create one in Supabase to get started.</Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item.id}
          renderItem={renderSession}
          contentContainerStyle={{ padding: 16, gap: 10 }}
        />
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#6366f1', padding: 24, paddingTop: 56 },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '700' },
  role: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', margin: 16, marginBottom: 4 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  cardLeft: { flex: 1 },
  cardCode: { fontSize: 12, color: '#6366f1', fontWeight: '700', letterSpacing: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  cardRoom: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  activeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 12 },
  badgeOn: { backgroundColor: '#dcfce7' },
  badgeOff: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeTextOn: { color: '#16a34a' },
  badgeTextOff: { color: '#94a3b8' },
  empty: { margin: 24, padding: 24, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  signOutBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center',
    borderWidth: 1, borderColor: '#fee2e2',
  },
  signOutText: { color: '#ef4444', fontWeight: '600' },
});