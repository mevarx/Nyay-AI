// js/auth.js
// All Supabase auth calls. Single source of truth — never write auth logic elsewhere.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY)

// ── Sign Up (Email + Password) ──────────────────────────────────────
async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })
  if (error) return { success: false, message: error.message }
  return { success: true, data }
}

// ── Sign In (Email + Password) ──────────────────────────────────────
async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })
  if (error) return { success: false, message: error.message }
  return { success: true, data }
}

// ── Sign In with Google OAuth ───────────────────────────────────────
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/upload.html'
    }
  })
  if (error) alert('Google login failed. Please try again.')
}

// ── Logout ──────────────────────────────────────────────────────────
async function logout() {
  await supabase.auth.signOut()
  window.location.href = 'index.html'
}

// ── Get Current User ────────────────────────────────────────────────
async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Populate User Info ──────────────────────────────────────────────
async function populateUserInfo() {
  const user = await getCurrentUser();
  if (!user) return;
  const nameEl = document.querySelector('.user-name');
  const avatarEl = document.querySelector('.user-avatar');
  if (nameEl) nameEl.textContent = user.user_metadata?.full_name || user.email;
  if (avatarEl) {
    const initials = (user.user_metadata?.full_name || user.email || 'U').substring(0, 2).toUpperCase();
    avatarEl.textContent = initials;
  }
}

// ── Get Session Token (JWT) ─────────────────────────────────────────
async function getSessionToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

// ── Require Auth (Page Guard) ───────────────────────────────────────
async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.href = 'login.html'
    return null
  }
  return user
}

// Export to window so non-module scripts can use them
window.signUp = signUp
window.signIn = signIn
window.signInWithGoogle = signInWithGoogle
window.logout = logout
window.getCurrentUser = getCurrentUser
window.getSessionToken = getSessionToken
window.requireAuth = requireAuth
window.supabase = supabase
