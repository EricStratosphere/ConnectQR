import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nseqrktoiymkjvhepfol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZXFya3RvaXlta2p2aGVwZm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTM0NTksImV4cCI6MjA5NDA4OTQ1OX0.UxtryIrN5FK7wJht8VumEs-wjjsrvh3jSXBrdj0FHZY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  return data;
};

export const checkInWithQR = async (qrToken, studentId) => {
  const { data: session, error: sessionError } = await supabase
    .from('schedules')
    .select(`
      id, is_active, start_time, end_time,
      courses ( course_name, course_code ),
      rooms ( room_name )
    `)
    .eq('qr_token', qrToken)
    .eq('is_active', true)
    .single();

  if (sessionError || !session) {
    return { success: false, status: 'invalid', message: 'QR code is invalid or session is not active.' };
  }

  const now = new Date();
  const lateThreshold = new Date(new Date(session.start_time).getTime() + 15 * 60 * 1000);
  const windowEnd = new Date(session.end_time);
  const status = now > lateThreshold ? 'late' : 'present';

  if (now > windowEnd) {
    return { success: false, status: 'expired', message: 'The attendance window has closed.' };
  }

  const { error: insertError } = await supabase
    .from('attendance_records')
    .upsert(
      { session_id: session.id, student_id: studentId, status, timestamp: now.toISOString() },
      { onConflict: 'session_id,student_id' }
    );

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, status: 'duplicate', message: 'You have already checked in for this session.' };
    }
    throw insertError;
  }

  return {
    success: true,
    status,
    message: status === 'late'
      ? `Marked as LATE for ${session.courses.course_name}`
      : `Checked in to ${session.courses.course_name} in ${session.rooms.room_name}!`,
    session,
  };
};

export const getSessionAttendance = async (sessionId) => {
  const { data, error } = await supabase
    .from('attendance_records')
    .select(`id, status, timestamp, users ( full_name, email )`)
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });
  if (error) throw error;
  return data;
};

export const toggleSession = async (sessionId, isActive) => {
  const { data, error } = await supabase
    .from('schedules')
    .update({ is_active: isActive })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
};