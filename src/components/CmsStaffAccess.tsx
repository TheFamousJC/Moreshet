import { apiUrl } from '../lib/api';
import React, { useEffect, useMemo, useState } from 'react';
import { Building2, KeyRound, Plus, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { AccountContext, OrganizationRole } from '../lib/supabase';

interface OrganizationSummary { id: string; name: string; slug: string; status: string }
interface StaffSummary {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  role: OrganizationRole;
  status: string;
  password_reset_required: boolean;
}

interface Props { account: AccountContext; onSignOut: () => void }
const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = crypto.getRandomValues(new Uint32Array(18));
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}

export const CmsStaffAccess: React.FC<Props> = ({ account, onSignOut }) => {
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [newOrganizationName, setNewOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<OrganizationRole>('editor');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const visibleStaff = useMemo(() => staff.filter((item) => !organizationId || item.organization_id === organizationId), [staff, organizationId]);

  const request = async (url: string, options?: RequestInit) => {
    const response = await fetch(apiUrl(url), { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${account.session.access_token}`, ...(options?.headers || {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'The request failed.');
    return body;
  };

  const load = async () => {
    setBusy(true); setMessage('');
    try {
      const body = await request('/api/admin/context');
      setOrganizations(body.organizations || []); setStaff(body.staff || []);
      setOrganizationId((current) => current || body.organizations?.[0]?.id || '');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Staff records could not be loaded.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);

  const createOrganization = async () => {
    if (!newOrganizationName.trim()) return;
    setBusy(true); setMessage('');
    try {
      await request('/api/admin/organizations', { method: 'POST', body: JSON.stringify({ name: newOrganizationName }) });
      setNewOrganizationName(''); await load(); setMessage('Organization created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Organization creation failed.'); }
    finally { setBusy(false); }
  };

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const body = await request('/api/admin/staff', { method: 'POST', body: JSON.stringify({ organizationId, email, username, displayName, role, temporaryPassword }) });
      setEmail(''); setUsername(''); setDisplayName(''); setTemporaryPassword(''); await load(); setMessage(body.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Staff account creation failed.'); }
    finally { setBusy(false); }
  };

  const reset = async (target: StaffSummary) => {
    setBusy(true); setMessage('');
    try {
      const body = await request('/api/admin/staff/reset-password', { method: 'POST', body: JSON.stringify({ organizationId: target.organization_id, targetUserId: target.user_id, temporaryPassword: resetPassword, reason: 'CMS administrator reset' }) });
      setResetTarget(null); setResetPassword(''); await load(); setMessage(body.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Password reset failed.'); }
    finally { setBusy(false); }
  };

  return <div className="space-y-4">
    <div className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase text-blue-700">Signed in</p><p className="font-bold text-slate-900">{account.profile.display_name || account.user.email}</p><p className="text-xs text-slate-500">{account.profile.platform_role === 'super_admin' ? 'Super Admin' : 'Organization Administrator'}</p></div><button onClick={onSignOut} className="rounded-xl border px-3 py-2 text-xs font-bold">Sign out</button></div></div>
    {message && <p role="status" aria-live="polite" className="rounded-xl bg-blue-50 p-3 text-xs font-semibold text-blue-900">{message}</p>}
    {account.profile.platform_role === 'super_admin' && <div className="rounded-2xl border bg-white p-4"><h3 className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-blue-800" /> Add organization</h3><div className="mt-3 flex gap-2"><input className={field} value={newOrganizationName} onChange={(e) => setNewOrganizationName(e.target.value)} placeholder="Organization name" /><button disabled={busy} onClick={createOrganization} className="rounded-xl bg-blue-900 px-3 text-white"><Plus className="h-4 w-4" /></button></div></div>}
    <form onSubmit={createStaff} className="rounded-2xl border bg-white p-4"><h3 className="flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4 text-blue-800" /> Create staff account</h3><p className="mt-1 text-xs text-slate-500">Create an individual account and a temporary password. The staff member must replace it at first login.</p><div className="mt-3 space-y-2"><select className={field} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} required><option value="">Select organization</option>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input type="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required /><input className={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" required /><input className={field} minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required /><select className={field} value={role} onChange={(e) => setRole(e.target.value as OrganizationRole)}><option value="editor">Editor</option><option value="reviewer">Reviewer</option>{account.profile.platform_role === 'super_admin' && <option value="administrator">Administrator</option>}</select><div className="flex gap-2"><input type="text" className={field} value={temporaryPassword} minLength={16} onChange={(e) => setTemporaryPassword(e.target.value)} placeholder="Temporary password (16+ characters)" required /><button type="button" onClick={() => setTemporaryPassword(generateTemporaryPassword())} className="rounded-xl border px-3" title="Generate temporary password"><KeyRound className="h-4 w-4" /></button></div><button disabled={busy || !organizationId} className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white disabled:opacity-50">Create account</button></div></form>
    <div className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-blue-800" /> Staff access</h3><button onClick={load} disabled={busy} className="rounded-lg p-2 text-blue-800"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></button></div><div className="mt-3 space-y-2">{visibleStaff.map((item) => <div key={item.id} className="rounded-xl border p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{item.display_name || item.email}</p><p className="truncate text-[10px] text-slate-500">{item.email} · {item.role} · {item.status}</p>{item.password_reset_required && <p className="mt-1 text-[10px] font-bold text-amber-700">Temporary password replacement required</p>}</div><button onClick={() => { setResetTarget(item.user_id); setResetPassword(generateTemporaryPassword()); }} className="rounded-lg bg-amber-50 p-2 text-amber-800" title="Issue temporary password"><KeyRound className="h-4 w-4" /></button></div>{resetTarget === item.user_id && <div className="mt-2 flex gap-2"><input className={field} value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} /><button disabled={busy} onClick={() => reset(item)} className="rounded-xl bg-amber-600 px-3 text-xs font-bold text-white">Reset</button></div>}</div>)}{!visibleStaff.length && <p className="text-xs text-slate-500">No staff accounts are configured for this organization.</p>}</div></div>
  </div>;
};
