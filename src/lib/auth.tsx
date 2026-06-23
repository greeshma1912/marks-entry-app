import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { UserProfile, AuthState } from './types';

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string, role: 'admin' | 'instructor') => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return profile as UserProfile | null;
  }

  async function createUserProfile(
    userId: string,
    email: string,
    fullName: string,
    role: 'admin' | 'instructor'
  ): Promise<{ profile: UserProfile | null; error: string | null }> {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating profile:', error);
      return { profile: null, error: error.message };
    }

    return { profile: profile as UserProfile, error: null };
  }

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchUserProfile(session.user.id);

          if (!mounted) return;

          if (profile) {
            setState({
              user: profile,
              loading: false,
              error: null,
            });
          } else {
            await supabase.auth.signOut();
            if (mounted) {
              setState({
                user: null,
                loading: false,
                error: null,
              });
            }
          }
        } else {
          setState({
            user: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) {
          setState({
            user: null,
            loading: false,
            error: null,
          });
        }
      }
    }

    // Timeout safeguard - force loading to false after 5 seconds
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn('Auth init timeout - forcing loading to false');
        setState(prev => {
          if (prev.loading) {
            return { user: null, loading: false, error: null };
          }
          return prev;
        });
      }
    }, 5000);

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const profile = await fetchUserProfile(session.user.id);

          if (profile) {
            setState({
              user: profile,
              loading: false,
              error: null,
            });
          } else {
            await supabase.auth.signOut();
            setState({
              user: null,
              loading: false,
              error: 'Account profile not found.',
            });
          }
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            loading: false,
            error: null,
          });
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      if (data.user) {
        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 500));

        let profile = await fetchUserProfile(data.user.id);

        if (profile) {
          setState({
            user: profile,
            loading: false,
            error: null,
          });
          return { error: null };
        } else {
          await supabase.auth.signOut();
          const message = 'Account exists but profile not found. Please try signing up again with the same email.';
          setState({
            user: null,
            loading: false,
            error: message,
          });
          return { error: message };
        }
      }

      return { error: null };
    } catch (error) {
      const message = 'An unexpected error occurred';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }

  async function signUp(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'instructor'
  ): Promise<{ error: string | null; needsConfirmation?: boolean }> {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (error) {
        setState(prev => ({ ...prev, loading: false, error: error.message }));
        return { error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setState({
          user: null,
          loading: false,
          error: null,
        });
        return {
          error: null,
          needsConfirmation: true
        };
      }

      // User is immediately signed in (email confirmation disabled)
      if (data.user && data.session) {
        // Wait for trigger to create profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        let profile = await fetchUserProfile(data.user.id);

        // If profile still doesn't exist after trigger, try manual creation
        if (!profile) {
          // Wait a bit more
          await new Promise(resolve => setTimeout(resolve, 1000));
          profile = await fetchUserProfile(data.user.id);
        }

        if (profile) {
          setState({
            user: profile,
            loading: false,
            error: null,
          });
          return { error: null };
        } else {
          // Profile creation failed
          await supabase.auth.signOut();
          setState({
            user: null,
            loading: false,
            error: 'Account created but profile setup failed. Please try signing in.',
          });
          return { error: null, needsConfirmation: false };
        }
      }

      return { error: null };
    } catch (error) {
      const message = 'An unexpected error occurred during signup';
      setState(prev => ({ ...prev, loading: false, error: message }));
      return { error: message };
    }
  }

  async function signOut(): Promise<void> {
    setState(prev => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({
      user: null,
      loading: false,
      error: null,
    });
  }

  const value: AuthContextType = {
    ...state,
    signIn,
    signUp,
    signOut,
    isAdmin: state.user?.role === 'admin',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
