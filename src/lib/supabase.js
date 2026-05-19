import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

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

export const signUp = async (email, password, fullName, role = 'student') => {
  console.log('Starting signup for:', email);
  
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    console.error('Auth signup error:', error);
    throw error;
  }
  
  console.log('Auth signup successful, user ID:', data.user?.id);
  
  // Create user profile
  if (data.user) {
    console.log('Attempting to insert user profile:', { id: data.user.id, email, full_name: fullName, role });
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert({ id: data.user.id, email, full_name: fullName, role });
    
    console.log('Insert response - Data:', insertData, 'Error:', insertError);
    
    if (insertError) {
      console.error('Error creating user profile:', insertError);
      throw new Error(`Failed to create user profile: ${insertError.code} - ${insertError.message}. Check Supabase RLS policies.`);
    }
    
    console.log('User profile created successfully');
  }
  
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
  
  // Handle case where user profile doesn't exist yet (e.g., just signed up)
  if (error) {
    if (error.code === 'PGRST116') {
      // No profile found - return null instead of throwing
      return null;
    }
    throw error;
  }
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