import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, PlantObservation, ExpertReviewCase, Farm, CropPlanting } from '../src/types.js';

// No hardcoded fallback: if these aren't set via environment variables,
// Supabase-backed features (auth verification, cross-sync) are disabled
// rather than silently pointing at an undocumented default project.
export const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

export const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabaseServer: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Verifies a Supabase JWT or session access token
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseUser | null> {
  if (!token || !isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabaseServer!.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('Failed to verify Supabase token:', err);
    return null;
  }
}

/**
 * Checks connectivity and health of the Supabase backend
 */
export async function checkSupabaseStatus(): Promise<{
  configured: boolean;
  projectUrl: string;
  authHealthy: boolean;
  authVersion?: string;
  tablesFound: string[];
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  if (!isSupabaseConfigured) {
    return {
      configured: false,
      projectUrl: '',
      authHealthy: false,
      tablesFound: [],
      latencyMs: 0,
      message: 'Supabase credentials are not configured.',
    };
  }

  let authHealthy = false;
  let authVersion = '';
  try {
    const healthRes = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      headers: { apikey: SUPABASE_ANON_KEY },
    });
    if (healthRes.ok) {
      const data = await healthRes.json();
      authHealthy = true;
      authVersion = data.version || 'GoTrue v2.x';
    }
  } catch (e: any) {
    console.warn('Supabase Auth health check warning:', e.message);
  }

  // Check known application tables on Supabase
  const checkTables = ['profiles', 'farms', 'plantings', 'observations', 'expert_cases'];
  const tablesFound: string[] = [];

  for (const table of checkTables) {
    try {
      const { error } = await supabaseServer!.from(table).select('id').limit(1);
      // If error is not PGRST205 (table not found), it exists!
      if (!error || error.code !== 'PGRST205') {
        tablesFound.push(table);
      }
    } catch {
      // ignore
    }
  }

  const latencyMs = Date.now() - start;

  return {
    configured: true,
    projectUrl: SUPABASE_URL,
    authHealthy,
    authVersion,
    tablesFound,
    latencyMs,
    message: authHealthy
      ? `Supabase Auth is live and connected (${latencyMs}ms).`
      : 'Supabase URL configured, awaiting Auth connectivity.',
  };
}

/**
 * Attempt to sync a record to Supabase if the table exists
 */
export async function trySyncRecordToSupabase(table: string, record: Record<string, any>): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabaseServer!.from(table).upsert(record);
    if (error) {
      // Table may not exist yet in user's Supabase project, which is normal until schema is run
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
