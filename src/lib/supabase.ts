import { createClient, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabasePublishableKey || 'missing-local-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type PlatformRole = 'super_admin' | 'user';
export type OrganizationRole = 'administrator' | 'editor' | 'reviewer';

export interface AccountProfile {
  user_id: string;
  platform_role: PlatformRole;
  username: string | null;
  display_name: string | null;
  preferred_language: 'en' | 'he' | 'ru' | 'fr' | 'de' | 'es';
  email_verified_at: string | null;
  age_eligibility_confirmed_at: string | null;
  status: 'active' | 'suspended' | 'deletion_requested' | 'anonymized';
  password_reset_required: boolean;
}

export interface AccountMembership {
  id: string;
  organization_id: string;
  role: OrganizationRole;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  organizations?: { name: string; slug: string } | null;
}

export interface AccountContext {
  session: Session;
  user: User;
  profile: AccountProfile;
  memberships: AccountMembership[];
  canAccessCms: boolean;
  canManageStaff: boolean;
}

export async function loadAccountContext(session: Session): Promise<AccountContext> {
  const [profileResult, membershipResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', session.user.id).single(),
    supabase
      .from('organization_memberships')
      .select('id, organization_id, role, status, organizations(name, slug)')
      .eq('user_id', session.user.id)
      .eq('status', 'active'),
  ]);

  if (profileResult.error || !profileResult.data) {
    throw new Error(profileResult.error?.message || 'The account profile could not be loaded.');
  }

  const memberships = (membershipResult.data || []) as unknown as AccountMembership[];
  const profile = profileResult.data as AccountProfile;
  const activeRoles = memberships.map((membership) => membership.role);

  return {
    session,
    user: session.user,
    profile,
    memberships,
    canAccessCms: profile.platform_role === 'super_admin' || activeRoles.some((role) => ['administrator', 'editor', 'reviewer'].includes(role)),
    canManageStaff: profile.platform_role === 'super_admin' || activeRoles.includes('administrator'),
  };
}
