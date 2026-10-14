import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config();

const args = process.argv.slice(2);
const value = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const email = value('--email')?.trim().toLowerCase();
const displayName = value('--display-name')?.trim() || 'Moreshet Super Admin';
const password = process.env.MORESHET_BOOTSTRAP_PASSWORD || '';
const url = process.env.SUPABASE_URL || '';
const secret = process.env.SUPABASE_SECRET_KEY || '';

if (!email || !url || !secret) {
  console.error('Usage: npm run auth:bootstrap -- --email you@example.com [--display-name "Name"]. For a new account, first set MORESHET_BOOTSTRAP_PASSWORD to 16+ characters.');
  process.exit(1);
}

const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { count, error: countError } = await supabase.from('profiles').select('user_id', { count: 'exact', head: true }).eq('platform_role', 'super_admin');
if (countError) throw countError;
if ((count || 0) > 0) {
  console.error('A Super Admin already exists. Use the CMS Staff & Access screen for further account management.');
  process.exit(1);
}

const username = email.split('@')[0].replace(/[^a-z0-9_-]/g, '').slice(0, 50) || 'superadmin';
const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;

const existingUser = (usersPage.users as User[]).find((user) => user.email?.toLowerCase() === email);
let userId: string;
let createdNewUser = false;

if (existingUser) {
  userId = existingUser.id;
  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, password.length >= 16
    ? {
        password,
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: existingUser.user_metadata?.display_name || displayName,
          username: existingUser.user_metadata?.username || username,
          age_16_confirmed: true,
          preferred_language: existingUser.user_metadata?.preferred_language || 'en',
        },
      }
    : {
        email_confirm: true,
        user_metadata: {
          ...existingUser.user_metadata,
          display_name: existingUser.user_metadata?.display_name || displayName,
          username: existingUser.user_metadata?.username || username,
          age_16_confirmed: true,
          preferred_language: existingUser.user_metadata?.preferred_language || 'en',
        },
      });
  if (updateError) throw updateError;
} else {
  if (password.length < 16) {
    console.error('The email is not registered. Set MORESHET_BOOTSTRAP_PASSWORD to a temporary password of at least 16 characters, then run this command again.');
    process.exit(1);
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName, username, age_16_confirmed: true, preferred_language: 'en' },
  });
  if (error || !data.user) throw error || new Error('User creation failed.');
  userId = data.user.id;
  createdNewUser = true;
}

const passwordWasReplaced = createdNewUser || password.length >= 16;
const { error: profileError } = await supabase.from('profiles').update({
  platform_role: 'super_admin',
  password_reset_required: passwordWasReplaced,
}).eq('user_id', userId);
if (profileError) {
  if (createdNewUser) await supabase.auth.admin.deleteUser(userId);
  throw profileError;
}
console.log(passwordWasReplaced
  ? `Super Admin ${existingUser ? 'enabled' : 'created'} for ${email}. Sign in with the temporary password and replace it immediately.`
  : `Super Admin enabled for ${email}. The existing password was not changed.`);
