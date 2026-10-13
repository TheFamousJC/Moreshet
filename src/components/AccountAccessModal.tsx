import React, { useEffect, useState } from 'react';
import { KeyRound, LogIn, ShieldCheck, UserPlus, X } from 'lucide-react';
import { AccountContext, isSupabaseConfigured, loadAccountContext, supabase } from '../lib/supabase';
import { useModalFocus } from '../hooks/useModalFocus';

type AccountMode = 'signin' | 'register' | 'forgot' | 'change-password';
export type AccountPromptReason = 'general' | 'comment' | 'story' | 'benjamin' | 'rating' | 'like' | 'nearby';

interface AccountAccessModalProps {
  isOpen: boolean;
  forcePasswordChange?: boolean;
  recoveryMode?: boolean;
  account?: AccountContext | null;
  promptReason?: AccountPromptReason;
  onClose: () => void;
  onAuthenticated: (context: AccountContext) => void;
  onSignOut: () => void;
}

const field = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

export const AccountAccessModal: React.FC<AccountAccessModalProps> = ({ isOpen, forcePasswordChange, recoveryMode, account, promptReason = 'general', onClose, onAuthenticated, onSignOut }) => {
  const [mode, setMode] = useState<AccountMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const modalRef = useModalFocus(isOpen, onClose, !forcePasswordChange && !recoveryMode);

  useEffect(() => {
    if (isOpen) setMode(forcePasswordChange || recoveryMode ? 'change-password' : 'signin');
  }, [isOpen, forcePasswordChange, recoveryMode]);

  if (!isOpen) return null;

  if (account && !forcePasswordChange && !recoveryMode) return <div ref={modalRef} className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-status-title">
    <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-950 text-amber-300"><ShieldCheck className="h-5 w-5" /></div><button type="button" onClick={onClose} aria-label="Close account window" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <h2 id="account-status-title" className="mt-3 text-lg font-bold text-blue-950">Your account</h2>
      <p className="mt-2 font-bold text-slate-900">{account.profile.display_name || account.user.email}</p><p className="text-xs text-slate-500">{account.user.email}</p>
      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><p><strong>Status:</strong> Signed in</p>{account.canAccessCms && <><p className="mt-1"><strong>Administration role:</strong> {account.profile.platform_role === 'super_admin' ? 'Super Admin' : 'Staff user'}</p><p className="mt-1"><strong>CMS access:</strong> Enabled</p></>}</div>
      <button onClick={onSignOut} className="mt-4 w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-bold text-rose-700">Sign out</button>
    </div>
  </div>;

  const finishSession = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw new Error(error?.message || 'No active session was created.');
    const context = await loadAccountContext(data.session);
    onAuthenticated(context);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (!isSupabaseConfigured) return setMessage('Supabase authentication is not configured.');
    if (mode === 'register' && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) return setMessage('Use at least 8 characters, including a letter and a number.');
    if (mode === 'change-password' && password.length < 16) return setMessage('Use at least 16 characters for the password.');
    if ((mode === 'register' || mode === 'change-password') && password !== confirmPassword) return setMessage('The passwords do not match.');
    if (mode === 'register' && !ageConfirmed) return setMessage('You must confirm that you are at least 16.');

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
        if (error) throw error;
        await finishSession();
      } else if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { display_name: displayName.trim(), username: username.trim(), age_16_confirmed: true, preferred_language: 'en' } },
        });
        if (error) throw error;
        if (data.session) await finishSession();
        else setMessage('Registration created. Check your email to verify the account before signing in.');
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
        if (error) throw error;
        setMessage('If the account exists, a password-reset message has been sent.');
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error('Sign in with the temporary password first.');
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        if (forcePasswordChange) {
          const response = await fetch('/api/account/password-reset-completed', {
            method: 'POST',
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
          });
          if (!response.ok) throw new Error((await response.json()).error || 'The password changed, but the account state could not be updated.');
        }
        await finishSession();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Account access failed.');
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signin' ? 'Sign in' : mode === 'register' ? 'Create account' : mode === 'forgot' ? 'Reset password' : recoveryMode ? 'Choose a new password' : 'Replace temporary password';
  const Icon = mode === 'register' ? UserPlus : mode === 'change-password' ? ShieldCheck : mode === 'forgot' ? KeyRound : LogIn;
  const promptCopy: Record<AccountPromptReason, string> = {
    general: 'Sign in to save tours, ask Benjamin, comment and share stories.',
    comment: 'Sign in to comment on this stop. You will return here after signing in.',
    story: 'Sign in to share your heritage story. You will return here after signing in.',
    benjamin: 'Sign in to ask Benjamin a question. You will return to the conversation after signing in.',
    rating: 'Sign in to rate this tour. You will return to the rating after signing in.',
    like: 'Sign in to like this tour. You will return here after signing in.',
    nearby: 'Sign in to save nearby places or ask Benjamin about them. You will return to the place after signing in.',
  };

  return <div ref={modalRef} className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="account-title">
    <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-950 text-amber-300"><Icon className="h-5 w-5" /></div>{!forcePasswordChange && !recoveryMode && <button type="button" onClick={onClose} aria-label="Close account window" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>}</div>
      <h2 id="account-title" className="mt-3 text-lg font-bold text-blue-950">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{mode === 'change-password' ? recoveryMode ? 'Choose a private password of at least 16 characters.' : 'A temporary password cannot be used again. Choose a private password now.' : mode === 'register' ? 'Create an account if you are 16 or older. Your password needs at least 8 characters, including a letter and a number.' : mode === 'forgot' ? 'Enter your email and we will send password-reset instructions.' : promptCopy[promptReason]}</p>
      <div className="mt-4 space-y-3">
        {mode === 'register' && <><div><label htmlFor="account-display-name" className="text-xs font-bold text-slate-600">Name shown to other visitors</label><input id="account-display-name" className={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /><p className="mt-1 text-[10px] text-slate-500">You can use your name, initials or a nickname.</p></div><div><label htmlFor="account-username" className="text-xs font-bold text-slate-600">Private sign-in username</label><input id="account-username" className={field} value={username} minLength={3} onChange={(e) => setUsername(e.target.value)} required /><p className="mt-1 text-[10px] text-slate-500">Used to identify your account. It is not shown with public comments.</p></div></>}
        {mode !== 'change-password' && <div><label htmlFor="account-email" className="text-xs font-bold text-slate-600">Email</label><input id="account-email" type="email" autoComplete="email" className={field} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>}
        {mode !== 'forgot' && <div><label htmlFor="account-password" className="text-xs font-bold text-slate-600">{mode === 'change-password' ? 'New password' : 'Password'}</label><input id="account-password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} className={field} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>}
        {(mode === 'register' || mode === 'change-password') && <div><label htmlFor="account-confirm-password" className="text-xs font-bold text-slate-600">Confirm password</label><input id="account-confirm-password" type="password" autoComplete="new-password" className={field} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></div>}
        {mode === 'register' && <label htmlFor="account-age-confirmed" className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-700"><input id="account-age-confirmed" type="checkbox" className="mt-0.5" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} /><span>I confirm that I am at least 16 years old.</span></label>}
      </div>
      {message && <p role="status" aria-live="polite" className={`mt-3 rounded-xl p-3 text-xs font-semibold ${message.includes('sent') || message.includes('created') ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>{message}</p>}
      <button disabled={busy} className="mt-4 w-full rounded-xl bg-blue-950 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Please wait…' : title}</button>
      {!forcePasswordChange && !recoveryMode && <div className="mt-3 flex justify-center gap-3 text-[11px] font-bold text-blue-800">{mode !== 'signin' && <button type="button" onClick={() => { setMode('signin'); setMessage(''); }}>Sign in</button>}{mode !== 'register' && <button type="button" onClick={() => { setMode('register'); setMessage(''); }}>Register</button>}{mode !== 'forgot' && <button type="button" onClick={() => { setMode('forgot'); setMessage(''); }}>Forgot password</button>}</div>}
    </form>
  </div>;
};
