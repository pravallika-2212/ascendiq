import { createClient } from '@supabase/supabase-js'

export type PublicSupabaseEnvironment = {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  NEXT_PUBLIC_SUPABASE_URL?: string
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
}

export function getPublicSupabaseConfig(environment?: PublicSupabaseEnvironment) {
  const url = (environment?.VITE_SUPABASE_URL || environment?.NEXT_PUBLIC_SUPABASE_URL || environment?.SUPABASE_URL)?.trim()
  const key = (environment?.VITE_SUPABASE_ANON_KEY || environment?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || environment?.SUPABASE_PUBLISHABLE_KEY)?.trim()
  return url && key ? { url, key } : null
}

const config = getPublicSupabaseConfig(import.meta.env)

export const isSupabaseConfigured = config !== null
export const supabase = isSupabaseConfigured
  ? createClient(config!.url, config!.key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

export function readableAuthError(message: string) {
  const lower = message.toLowerCase()
  if (lower.includes('already registered') || lower.includes('already been registered')) return 'An account with this email already exists. Try logging in instead.'
  if (lower.includes('profiles_institution_cohort_roll_number_unique') || lower.includes('roll number is already registered')) return 'That roll number is already registered for this institution and admission year. Check the details or contact your institution.'
  if (lower.includes('student_registration_requests_roll_cohort_unique')) return 'That roll number already has a pending registration for this institution name and admission year.'
  if (lower.includes('student_registration_requests_pkey') || lower.includes('duplicate key value')) return 'A registration request for this account already exists. Please log in or check your verification status.'
  if (lower.includes('database error saving new user')) return 'Database trigger conflict: migration 007 duplicate trigger on auth.users needs to be updated in the Supabase SQL Editor.'
  if (lower.includes('email rate limit exceeded')) return 'Email confirmation rate limit reached. Please wait a few minutes before trying again.'
  if (lower.includes('a pending document is already submitted')) return 'A verification document is already awaiting review. Check your verification status before submitting another file.'
  if (lower.includes('invalid login credentials')) return 'The email or password is incorrect.'
  if (lower.includes('email not confirmed')) return 'Please confirm your email from the message we sent, then log in.'
  if (lower.includes('password')) return 'Choose a stronger password and try again.'
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('timeout')) return 'We could not reach Supabase. Check your connection and project configuration.'
  return message && message !== 'request failed' ? message : 'We could not complete that request. Check your details and try again.'
}
