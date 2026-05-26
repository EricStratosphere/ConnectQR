import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, 
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase, signOut } from '../lib/supabase';

import AddCourseModal from './components/AddCourseModal';
import AddSessionModal from './components/AddSessionModal'; 

// ─── Sub-screens ─────────────────────────────────────────────────────────────

function SessionsTab({ sessions, loading, navigation, onAddPress }) {
  const now = new Date();

  const liveSessions     = sessions.filter(s => s.is_active);
  const upcomingSessions = sessions.filter(s => !s.is_active && new Date(s.end_time) > now);
  const pastSessions     = sessions.filter(s => !s.is_active && new Date(s.end_time) <= now);

  const renderSession = ({ item, isLive }) => {
    return (
      <TouchableOpacity
        style={[styles.card, isLive && { borderColor: '#059669', borderWidth: 1.5 }]}
        onPress={() => navigation.navigate('SessionControl', { sessionId: item.id })}
      >
        <View style={styles.cardLeft}>
          <Text style={styles.cardCode}>{item.courses?.course_code}</Text>
          <Text style={styles.cardName}>{item.courses?.course_name}</Text>
          <Text style={styles.cardMeta}>
            <Ionicons name="location-outline" size={12} /> {item.rooms?.room_name || 'TBA'}  ·  
            <Ionicons name="time-outline" size={12} style={{ marginLeft: 6 }} /> {new Date(item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={[
          styles.badge,
          item.is_active ? styles.badgeLive
            : (new Date(item.end_time) > now) ? styles.badgeUpcoming
            : styles.badgeClosed,
        ]}>
          <Text style={[
            styles.badgeText,
            item.is_active ? styles.badgeTextLive
              : (new Date(item.end_time) > now) ? styles.badgeTextUpcoming
              : styles.badgeTextClosed,
          ]}>
            {item.is_active ? 'LIVE' : (new Date(item.end_time) > now) ? 'UPCOMING' : 'CLOSED'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#1c625c" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
        <Ionicons name="calendar" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Schedule New Session</Text>
      </TouchableOpacity>

      {liveSessions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>🔴 Live Right Now</Text>
          {liveSessions.map(item => <View key={item.id}>{renderSession({ item, isLive: true })}</View>)}
        </>
      )}

      {upcomingSessions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: liveSessions.length > 0 ? 16 : 0 }]}>Upcoming Sessions</Text>
          {upcomingSessions.map(item => <View key={item.id}>{renderSession({ item, isLive: false })}</View>)}
        </>
      )}

      {pastSessions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Previous Sessions</Text>
          {pastSessions.map(item => <View key={item.id}>{renderSession({ item, isLive: false })}</View>)}
        </>
      )}

      {sessions.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No sessions found. Schedule one to get started.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function CoursesTab({ courses, loading, onAddPress, navigation }) {
  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color="#1c625c" />;

  return (
    <ScrollView contentContainerStyle={styles.tabContent}>
      <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addBtnText}>Register to Course</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Your Registered Courses</Text>

      {courses.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>You are not registered to any courses yet.</Text>
        </View>
      )}

      {courses.map(course => (
        <TouchableOpacity 
          key={course.id} 
          style={styles.card}
          onPress={() => navigation.navigate('CourseDetails', { course })}
        >
          <View style={styles.cardLeft}>
            <Text style={styles.cardCode}>{course.course_code}</Text>
            <Text style={styles.cardName}>{course.course_name}</Text>
            <Text style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={12} /> {course.session_count} Sessions Created
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

const TABS = ['Sessions', 'Courses'];

export default function InstructorDashboard({ navigation, profile }) {
  const [activeTab, setActiveTab]         = useState(0);
  const [sessions, setSessions]           = useState([]);
  const [courses, setCourses]             = useState([]);
  const [rooms, setRooms]                 = useState([]); // NEW: Store rooms list
  const [loading, setLoading]             = useState(true);
  
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [addingData, setAddingData]   = useState(false);

  const loadSessions = useCallback(async () => {
    const { data } = await supabase
      .from('schedules')
      .select(`id, is_active, start_time, end_time, courses!inner ( course_name, course_code, instructor_id ), rooms ( room_name )`)
      .eq('courses.instructor_id', profile?.id)
      .order('start_time', { ascending: false });
    setSessions(data ?? []);
  }, [profile?.id]);

  const loadCourses = useCallback(async () => {
    const { data } = await supabase
      .from('courses')
      .select(`
        id, course_name, course_code,
        schedules ( id )
      `)
      .eq('instructor_id', profile?.id);
      
    const enriched = (data ?? []).map(c => ({
      ...c,
      session_count: c.schedules?.length || 0,
    }));
    setCourses(enriched);
  }, [profile?.id]);

  // NEW: Fetch available rooms from the database
  const loadRooms = useCallback(async () => {
    const { data } = await supabase
      .from('rooms')
      .select('id, room_name, allowed_ip')
      .order('room_name', { ascending: true });
    setRooms(data ?? []);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (profile?.id) {
        setLoading(true);
        Promise.all([loadSessions(), loadCourses(), loadRooms()]).then(() => setLoading(false));
      }
    });
    return unsubscribe;
  }, [navigation, profile?.id, loadSessions, loadCourses, loadRooms]);

  const handleAddCourse = async (courseData) => {
    setAddingData(true);
    try {
      const { data: existingCourse } = await supabase.from('courses').select('id').eq('course_code', courseData.courseCode).maybeSingle();
      if (existingCourse) {
        await supabase.from('courses').update({ instructor_id: profile.id, course_name: courseData.courseName }).eq('id', existingCourse.id);
      } else {
        await supabase.from('courses').insert({ instructor_id: profile.id, course_code: courseData.courseCode, course_name: courseData.courseName });
      }
      setCourseModalVisible(false);
      loadCourses(); 
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setAddingData(false);
    }
  };

  const handleAddSession = async (sessionData) => {
    setAddingData(true);
    try {
      const qrToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // INSERT TO DATABASE WITH ROOM ID INCLUDED
      const { error } = await supabase.from('schedules').insert({
        course_id: sessionData.courseId, 
        room_id: sessionData.roomId, // <--- Providing the room to satisfy the database
        start_time: sessionData.startTime, 
        end_time: sessionData.endTime, 
        qr_token: qrToken, 
        is_active: false
      });
      
      if (error) {
        console.log("Supabase Error:", error);
        throw new Error(error.message);
      }

      if (sessionData.allowedIp) {
        const { error: roomError } = await supabase
          .from('rooms')
          .update({ allowed_ip: sessionData.allowedIp })
          .eq('id', sessionData.roomId);

        if (roomError) {
          throw new Error(roomError.message);
        }
      }
      
      setSessionModalVisible(false);
      await loadSessions();
      await loadCourses();
      
      Alert.alert('Success', 'Session created successfully!');
    } catch (error) {
      Alert.alert('Failed to Create Session', error.message);
    } finally {
      setAddingData(false);
    }
  };

  const liveCount = sessions.filter(s => s.is_active).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, <Text style={styles.greetingName}>{profile?.full_name ?? 'Instructor'}</Text> </Text>
            <Text style={styles.subtitle}>Instructor</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('InstructorProfile', { profile })}>
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.statRow}>
          <View style={styles.statCard}><Text style={styles.statNum}>{courses.length}</Text><Text style={styles.statLbl}>Courses</Text></View>
          <View style={styles.statCard}><Text style={styles.statNum}>{liveCount}</Text><Text style={styles.statLbl}>Live Now</Text></View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={[styles.tabItem, activeTab === i && styles.tabItemActive]} onPress={() => setActiveTab(i)}>
            <Text style={[styles.tabText, activeTab === i && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 0 && <SessionsTab sessions={sessions} loading={loading} navigation={navigation} onAddPress={() => setSessionModalVisible(true)} />}
      {activeTab === 1 && <CoursesTab courses={courses} loading={loading} onAddPress={() => setCourseModalVisible(true)} navigation={navigation} />}

      <AddCourseModal visible={courseModalVisible} onClose={() => setCourseModalVisible(false)} onSubmit={handleAddCourse} loading={addingData} />
      
      {/* Passed the 'rooms' list directly to the Modal */}
      <AddSessionModal 
        visible={sessionModalVisible} 
        onClose={() => setSessionModalVisible(false)} 
        onSubmit={handleAddSession} 
        courses={courses} 
        rooms={rooms}
        loading={addingData} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f8fafc' },
  header:       { backgroundColor: '#1c625c', padding: 20, paddingTop: 52 },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  greeting:     { color: '#fff', fontSize: 20, fontWeight: '700' },
  greetingName: { fontWeight: '400', fontStyle: 'italic' },
  subtitle:     { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  profileBtn:   { padding: 4 },
  statRow:      { flexDirection: 'row', gap: 8 },
  statCard:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10, alignItems: 'center' },
  statNum:      { color: '#fff', fontSize: 22, fontWeight: '700' },
  statLbl:      { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  tabBar:       { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabItem:      { flex: 1, paddingVertical: 13, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabItemActive:{ borderBottomColor: '#1c625c' },
  tabText:      { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive:{ color: '#1c625c' },
  tabContent:   { padding: 16, gap: 10, paddingBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', elevation: 2, flexDirection: 'row', alignItems: 'center' },
  cardLeft:     { flex: 1 },
  cardCode:     { fontSize: 11, color: '#1c625c', fontWeight: '700', letterSpacing: 1 },
  cardName:     { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 2 },
  cardMeta:     { fontSize: 12, color: '#94a3b8', marginTop: 6, fontWeight: '500' },
  badge:        { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 12, alignSelf: 'flex-start' },
  badgeText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  badgeLive:    { backgroundColor: '#dcfce7' },
  badgeTextLive:{ color: '#059669' },
  badgeClosed:  { backgroundColor: '#f1f5f9' },
  badgeTextClosed:{ color: '#94a3b8' },
  badgeUpcoming:{ backgroundColor: '#eff6ff' },
  badgeTextUpcoming:{ color: '#2563eb' },
  addBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1c625c', borderRadius: 12, padding: 14, marginBottom: 6 },
  addBtnText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
  empty:        { alignItems: 'center', padding: 32, gap: 12 },
  emptyText:    { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});