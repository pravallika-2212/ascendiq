import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import { isSupabaseConfigured, readableAuthError, supabase } from '../lib/supabase'
import { resolvePortalHome } from '../auth/portalAccess'
import { institutionNameError, isValidRollNumber, MAX_ID_PROOF_BYTES, normalizeInstitutionName, normalizeRollNumber } from '../lib/registrationRules'

type AuthPageType = 'login' | 'register' | 'forgot-password' | 'reset-password'
const logo = '/assets/ascendiq-logo.jpeg'

function go(path: string) { window.location.assign(path) }
function Brand() { return <a className="brand" href="/" aria-label="Ascendiq home"><img src={logo} alt=""/><span>ascendiq<span className="brand-dot">.</span><small>STUDENT SUCCESS, IN FOCUS</small></span></a> }
function ConfigNotice() { return <div className="demo-alert" role="status"><ShieldCheck size={17}/><span>Supabase isn’t configured for this app yet. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>, apply the migrations, then restart Vite.</span></div> }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className={`auth-field ${error?'field-error':''}`}><span>{label}</span>{children}{error&&<small role="alert">{error}</small>}</label> }
function AuthShell({ children }: { children: React.ReactNode }) { return <main className="auth-page"><div className="auth-brand"><Brand/><a href="/" className="back-home">← Back to home</a></div><div className="auth-layout"><div className="auth-art"><span className="auth-orb"/><img src={logo} alt="Ascendiq silver emblem"/><div className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</div><h1>Helping potential<br/>find its <em>way forward.</em></h1><p>One thoughtful view of progress, learning, and career readiness.</p><div className="auth-note"><ShieldCheck size={17}/> Student data deserves care and transparency.</div></div><section className="auth-form">{children}</section></div></main> }

type RegistrationSuccessData = {
  email: string
  fullName: string
  institutionName: string
  programName: string
  departmentName: string
  hasSession: boolean
  verificationSubmitted: boolean
  verificationErrorNotice?: string
}

type ActiveSessionNotice = {
  email: string
  targetPath: string
  portalTitle: string
}

export default function AuthPage({ type }: { type: AuthPageType }) {
  const { session, loading: sessionLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({})
  const [registrationSchemaReady, setRegistrationSchemaReady] = useState(false)
  const [registrationSchemaMessage, setRegistrationSchemaMessage] = useState('')
  const [document, setDocument] = useState<File | null>(null)
  const [activeSessionNotice, setActiveSessionNotice] = useState<ActiveSessionNotice | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState<RegistrationSuccessData | null>(null)

  useEffect(() => {
    if (!supabase || type !== 'register') { setRegistrationSchemaReady(false); setRegistrationSchemaMessage(''); return }
    let cancelled = false
    setRegistrationSchemaReady(false)
    setRegistrationSchemaMessage('Checking registration setup…')
    supabase.rpc('manual_institution_registration_ready').then(({ data, error: setupError }) => {
      if (cancelled) return
      if (setupError || data !== true) {
        setRegistrationSchemaMessage('Manual institution registration is not enabled yet. A trusted project operator must review and apply migration 007 before registration can continue.')
        return
      }
      setRegistrationSchemaReady(true)
      setRegistrationSchemaMessage('Institution, program, and department details will remain pending until a trusted reviewer matches them to verified records.')
    })
    return () => { cancelled = true }
  }, [type, supabase])

  useEffect(() => {
    if (!session || sessionLoading || type === 'reset-password' || type === 'register') return
    let cancelled = false
    resolvePortalHome(session.user.id).then(targetPath => {
      if (cancelled) return
      setActiveSessionNotice({
        email: session.user.email ?? 'Current Account',
        targetPath,
        portalTitle: targetPath === '/student' ? 'Student Home' : targetPath === '/admin' ? 'Reviewer Portal' : targetPath === '/faculty' ? 'Faculty Portal' : targetPath === '/placement' ? 'Placement Portal' : 'Dashboard'
      })
    }).catch((cause) => {
      if (!cancelled) {
        setError(readableAuthError(cause instanceof Error ? cause.message : 'We could not check your account status.'))
      }
    })
    return () => { cancelled = true }
  }, [session, sessionLoading, type])

  async function createVerification(userId: string, file: File | null) {
    if (!supabase) throw new Error('Supabase is not configured.')
    let path: string | null = null
    if (file) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'bin'
      path = `${userId}/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('student-verifications').upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
    }
    const { error: rowError } = await supabase.rpc('submit_student_verification_document', { p_document_path: path })
    if (rowError) {
      if (path) await supabase.storage.from('student-verifications').remove([path])
      throw rowError
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage(''); setFieldErrors({})
    if (!supabase) { setError('Supabase isn’t configured yet. Follow the setup instructions in README.md.'); return }
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') || '').trim()
    const password = String(form.get('password') || '')
    if (type !== 'reset-password' && !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldErrors({ email: 'Enter a valid email address.' })
      return
    }
    setBusy(true)
    try {
      if (type === 'register') {
        const fullName = String(form.get('full_name') || '').trim()
        const institutionName = normalizeInstitutionName(String(form.get('institution_name') || ''))
        const programName = String(form.get('program_name') || '').trim()
        const departmentName = String(form.get('department_name') || '').trim()
        const rollNumber = normalizeRollNumber(String(form.get('roll_number') || ''))
        const academicYear = Number(form.get('academic_year'))
        const admissionRaw = String(form.get('admission_year') || '').trim()
        const admissionYear = admissionRaw ? Number(admissionRaw) : null
        const confirm = String(form.get('confirm_password') || '')
        const nextErrors: Record<string,string> = {}
        if (fullName.length < 2) nextErrors.full_name = 'Enter your full name.'
        if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = 'Enter a valid email address.'
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) nextErrors.password = 'Use at least 8 characters, including a letter and a number.'
        if (confirm !== password) nextErrors.confirm_password = 'The passwords do not match.'
        const institutionError = institutionNameError(institutionName)
        if (institutionError) nextErrors.institution_name = institutionError
        if (programName.length < 2 || programName.length > 180) nextErrors.program_name = 'Enter a program name between 2 and 180 characters.'
        if (departmentName.length < 2 || departmentName.length > 180) nextErrors.department_name = 'Enter a department name between 2 and 180 characters.'
        if (!Number.isInteger(academicYear) || academicYear < 1 || academicYear > 12) nextErrors.academic_year = 'Enter a current year of study from 1 to 12. It will be checked when your program is verified.'
        if (!isValidRollNumber(rollNumber)) nextErrors.roll_number = 'Enter a roll number using 1 to 100 characters.'
        if (!admissionRaw || !Number.isInteger(admissionYear) || admissionYear! < 1950 || admissionYear! > new Date().getFullYear()) nextErrors.admission_year = 'Enter a valid admission year.'
        if (!document) nextErrors.document = 'Select your student ID proof.'
        else if (document.size > MAX_ID_PROOF_BYTES || !['application/pdf','image/jpeg','image/png'].includes(document.type)) nextErrors.document = 'Choose a PDF, JPG, or PNG under 5 MiB.'
        if (!form.get('privacy_consent')) nextErrors.privacy_consent = 'Consent is required to create a student profile.'
        if (Object.keys(nextErrors).length) { setFieldErrors(nextErrors); setBusy(false); return }

        const { data: setupReady, error: setupError } = await supabase.rpc('manual_institution_registration_ready')
        if (setupError || setupReady !== true) {
          setError('Manual institution registration is not enabled yet. Ask a trusted project operator to review and apply migration 007.')
          setBusy(false)
          return
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/verification-pending`, data: {
            full_name: fullName, institution_name: institutionName, program_name: programName, department_name: departmentName,
            academic_year: academicYear, admission_year: admissionYear, student_id: rollNumber, roll_number: rollNumber, privacy_consent: true,
          } },
        })
        if (signUpError) throw signUpError

        let verificationSubmitted = false
        let verificationNotice = ''
        const hasSession = Boolean(data.session && data.user)
        if (hasSession && data.user) {
          try {
            await createVerification(data.user.id, document)
            verificationSubmitted = true
          } catch (verificationError) {
            verificationNotice = verificationError instanceof Error && verificationError.message
              ? verificationError.message
              : 'Account created, but ID proof upload was interrupted. You can submit it from your verification details page.'
          }
        }

        setRegistrationSuccess({
          email,
          fullName,
          institutionName,
          programName,
          departmentName,
          hasSession,
          verificationSubmitted,
          verificationErrorNotice: verificationNotice
        })
        return
      } else if (type === 'login') {
        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) throw loginError
        go(loginData.user ? await resolvePortalHome(loginData.user.id) : '/student')
      } else if (type === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
        if (resetError) throw resetError
        setMessage('If an account exists for that address, a password-reset link has been sent.')
      } else if (type === 'reset-password') {
        const confirm = String(form.get('confirm_password') || '')
        if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) { setFieldErrors({ password: 'Use at least 8 characters, including a letter and a number.' }); setBusy(false); return }
        if (password !== confirm) { setFieldErrors({ confirm_password: 'The passwords do not match.' }); setBusy(false); return }
        const { error: updateError } = await supabase.auth.updateUser({ password })
        if (updateError) throw updateError
        setMessage('Your password has been updated. You can now log in.')
        window.setTimeout(() => go('/login'), 1200)
      }
    } catch (cause) {
      console.error('[Auth submission error]', cause)
      setError(readableAuthError(cause instanceof Error ? cause.message : 'request failed'))
    } finally { setBusy(false) }
  }

  // Render registration success state with clear next actions
  if (type === 'register' && registrationSuccess) {
    return (
      <AuthShell>
        <div className="eyebrow eyebrow-light"><span/> ASCENDIQ · ACCOUNT REGISTRATION</div>
        <h2>Account Created Successfully</h2>
        <p className="auth-sub">
          Welcome to ASCENDIQ, <b>{registrationSuccess.fullName}</b>. Your student account has been registered.
        </p>

        {registrationSuccess.hasSession ? (
          <div style={{ background: '#FFF8F7', border: '1px solid #F0A9BC', borderRadius: 10, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4B1028', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <ShieldCheck size={18} color="#C77D93" />
              Institution Verification Pending
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#4B1028', lineHeight: 1.6 }}>
              Your student account is active. Your claimed institution, program, and department are awaiting verification by an authorized reviewer.
              You can enter your Student Home right now to view permitted personal analytics, or check your verification status anytime.
            </p>
            {registrationSuccess.verificationErrorNotice && (
              <p style={{ margin: '8px 0 0', fontSize: 11, color: '#C53030' }}>
                Note: {registrationSuccess.verificationErrorNotice}
              </p>
            )}
          </div>
        ) : (
          <div style={{ background: '#FFFDE7', border: '1px solid #FFE082', borderRadius: 10, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#E65100', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              <ShieldCheck size={18} color="#FB8C00" />
              Email Confirmation Required
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#5D4037', lineHeight: 1.6 }}>
              A confirmation link was sent to <b>{registrationSuccess.email}</b>.
              Please check your inbox and verify your email address before signing in. Once confirmed, you can sign in to view your Student Home.
            </p>
          </div>
        )}

        <div style={{ background: '#FAF0F2', border: '1px solid #F6C8D3', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 12px', color: '#4B1028' }}>
            <span style={{ color: '#C77D93', fontWeight: 600 }}>Claimed College:</span>
            <span><b>{registrationSuccess.institutionName}</b></span>
            <span style={{ color: '#C77D93', fontWeight: 600 }}>Program / Course:</span>
            <span>{registrationSuccess.programName}</span>
            <span style={{ color: '#C77D93', fontWeight: 600 }}>Department:</span>
            <span>{registrationSuccess.departmentName}</span>
            <span style={{ color: '#C77D93', fontWeight: 600 }}>Review Status:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
              <b style={{ color: '#B45309' }}>Pending Verification</b>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {registrationSuccess.hasSession ? (
            <a className="button" href="/student" style={{ width: '100%' }}>
              Continue to Student Home <ArrowRight size={16} />
            </a>
          ) : (
            <a className="button" href="/login" style={{ width: '100%' }}>
              Sign In to Your Account <ArrowRight size={16} />
            </a>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <a className="button button-secondary" href="/verification-pending" style={{ width: '100%', textAlign: 'center' }}>
              Check Verification Status
            </a>
            <a className="button button-secondary" href="/login" style={{ width: '100%', textAlign: 'center' }}>
              Sign In
            </a>
          </div>
        </div>
      </AuthShell>
    )
  }

  const heading = type === 'login' ? 'Welcome back' : type === 'register' ? 'Create your student account' : type === 'forgot-password' ? 'Reset your password' : 'Choose a new password'
  return <AuthShell><div className="eyebrow eyebrow-light"><span/> ASCENDIQ · PHASE 2</div><h2>{heading}</h2><p className="auth-sub">{type === 'login' ? 'Log in to check your account and verification status.' : type === 'register' ? 'Submit your details for institution review.' : type === 'forgot-password' ? 'We’ll email a secure password-reset link if an account exists.' : 'Use a new password for your account.'}</p>
    {!isSupabaseConfigured && <ConfigNotice/>}
    {type === 'register' && registrationSchemaMessage && <div className={`form-message ${registrationSchemaReady?'form-success':'form-error'}`} role={registrationSchemaReady?'status':'alert'}>{registrationSchemaMessage}</div>}
    {error && <div className="form-message form-error" role="alert">{error}</div>}
    {message && <div className="form-message form-success" role="status">{message}</div>}
    {activeSessionNotice && type === 'login' && (
      <div className="form-message" style={{ background: '#FFF8F7', border: '1px solid #F0A9BC', color: '#4B1028', padding: '14px 16px', borderRadius: 10, marginBottom: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: '#300817', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={16} color="#A95873" /> Active Session Detected
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
          You are currently signed in as <b>{activeSessionNotice.email}</b>.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <a className="button" href={activeSessionNotice.targetPath} style={{ fontSize: 11, padding: '7px 14px' }}>
            Continue to {activeSessionNotice.portalTitle} <ArrowRight size={13}/>
          </a>
          <button
            type="button"
            className="button button-secondary"
            onClick={async () => {
              if (supabase) await supabase.auth.signOut();
              setActiveSessionNotice(null);
            }}
            style={{ fontSize: 11, padding: '7px 14px' }}
          >
            Sign Out & Switch Account
          </button>
        </div>
      </div>
    )}
    <form onSubmit={submit} noValidate>
      {type === 'register' && <>
        <Field label="Full name" error={fieldErrors.full_name}><input name="full_name" autoComplete="name" required placeholder="Your full name"/></Field>
        <Field label="Institution Name" error={fieldErrors.institution_name}><input name="institution_name" autoComplete="organization" required maxLength={180} placeholder="Enter your college or institution name"/></Field>
        <Field label="Course / academic program" error={fieldErrors.program_name}><input name="program_name" required maxLength={180} placeholder="Enter your course or academic program"/></Field>
        <Field label="Department" error={fieldErrors.department_name}><input name="department_name" required maxLength={180} placeholder="Enter your department"/></Field>
        <div className="field-row"><Field label="Current year of study" error={fieldErrors.academic_year}><input name="academic_year" type="number" min="1" max="12" required placeholder="1"/><small>Program duration is checked when your institution details are verified.</small></Field><Field label="Admission year" error={fieldErrors.admission_year}><input name="admission_year" inputMode="numeric" type="number" min="1950" max={new Date().getFullYear()} required placeholder="2024"/></Field></div>
        <Field label="Roll number" error={fieldErrors.roll_number}><input name="roll_number" autoComplete="off" required maxLength={100} placeholder="Your institution-issued roll number"/></Field>
      </>}
      {type !== 'reset-password' && <Field label="Email address" error={fieldErrors.email}><input name="email" type="email" autoComplete="email" required placeholder="you@institution.edu"/></Field>}
      {type !== 'forgot-password' && <Field label="Password" error={fieldErrors.password}><div className="password-field"><input name="password" type={showPassword?'text':'password'} autoComplete={type==='login'?'current-password':'new-password'} required placeholder="At least 8 characters"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div>{type!=='login'&&<small>At least 8 characters, including one letter and one number.</small>}</Field>}
      {(type === 'register' || type === 'reset-password') && <Field label="Confirm password" error={fieldErrors.confirm_password}><input name="confirm_password" type={showPassword?'text':'password'} autoComplete="new-password" required placeholder="Enter the password again"/></Field>}
      {type === 'register' && <Field label="Student ID proof" error={fieldErrors.document}><input type="file" accept="application/pdf,image/jpeg,image/png" required onChange={e=>setDocument(e.target.files?.[0]??null)}/><small>Required. Private PDF, JPG, or PNG · maximum 5 MB. If email confirmation is required, select the file again after you confirm and log in. Uploading does not verify your identity.</small></Field>}
      {type === 'register' && <label className="consent-row"><input name="privacy_consent" type="checkbox"/><span>I consent to Ascendiq processing these details to create my student profile and route it for institution verification. <a href="/privacy">Read the privacy notice</a>.</span></label>}
      {type === 'login' && <div className="form-row"><span/><a href="/forgot-password">Forgot password?</a></div>}
      <button className="button auth-submit" type="submit" disabled={busy || !isSupabaseConfigured || (type==='register' && !registrationSchemaReady)}>{busy?'Please wait…':type==='login'?'Log in':type==='register'?'Create account':type==='forgot-password'?'Send reset link':'Save new password'} <ArrowRight size={16}/></button>
    </form>
    <div className="auth-switch">{type === 'login' && <>New to Ascendiq? <a href="/register">Register</a></>}{type === 'register' && <>Already have an account? <a href="/login">Log in</a></>}{type === 'forgot-password' && <>Remembered your password? <a href="/login">Log in</a></>}{type === 'reset-password' && <>Go back to <a href="/login">log in</a></>}</div>
    {type==='register'&&<p className="auth-legal">Your account starts as pending. The institution’s authorized reviewer decides verification. No staff permissions are assigned by public signup.</p>}
  </AuthShell>
}
