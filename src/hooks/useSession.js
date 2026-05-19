import { useState, useEffect } from 'react';
import { supabase, getCurrentUserProfile } from '../lib/supabase';

export const useSession = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize session on app load
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setSession(null);
          setProfile(null);
        } else {
          setSession(session);
          if (session) {
            try {
              const p = await getCurrentUserProfile();
              setProfile(p);
            } catch (err) {
              console.error('Error fetching user profile:', err);
              setProfile(null);
            }
          }
        }
      } catch (err) {
        console.error('Unexpected error during session init:', err);
        setSession(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          try {
            const p = await getCurrentUserProfile();
            setProfile(p);
          } catch (err) {
            console.error('Error fetching user profile on auth change:', err);
            setProfile(null);
          }
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  return { session, profile, loading };
};