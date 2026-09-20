import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase credentials must come from environment variables. No hardcoded
// fallback: without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY set, Supabase
// auth is simply disabled (the app falls back to local JWT auth) rather than
// silently connecting to an undocumented default project.
export const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export interface SupabaseAuthResult {
  success: boolean;
  user?: any;
  session?: any;
  error?: string;
  emailConfirmationRequired?: boolean;
}

/**
 * Sign up a user with Supabase Auth
 */
export async function supabaseSignUp(
  email: string,
  password: string,
  metadata: {
    fullName: string;
    role: string;
    county: string;
    organization?: string;
  }
): Promise<SupabaseAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured for this deployment.' };
  }
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: metadata.fullName,
          role: metadata.role,
          county: metadata.county,
          organization: metadata.organization || '',
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    // Check if session was created or if confirmation email is required
    const session = data.session;
    const user = data.user;
    const emailConfirmationRequired = !session && Boolean(user);

    return {
      success: true,
      user,
      session,
      emailConfirmationRequired,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to sign up with Supabase.',
    };
  }
}

/**
 * Sign in a user with Supabase Auth
 */
export async function supabaseSignIn(email: string, password: string): Promise<SupabaseAuthResult> {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured for this deployment.' };
  }
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      const isUnconfirmed =
        error.message?.toLowerCase().includes('email not confirmed') ||
        (error as any).code === 'email_not_confirmed';
      return {
        success: false,
        error: error.message,
        emailConfirmationRequired: isUnconfirmed,
      };
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to sign in with Supabase.',
    };
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function supabaseSignOut(): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: true };
  }
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sign out from Supabase.' };
  }
}
