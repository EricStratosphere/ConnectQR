import { useState, useEffect } from 'react';
import { supabase, getCurrentUserProfile } from '../lib/supabase';

export const useSession = () => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        try {
          const p = await getCurrentUserProfile();
          setProfile(p);
        } catch (_) {}
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          try {
            const p = await getCurrentUserProfile();
            setProfile(p);
          } catch (_) {}
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { session, profile, loading };
};