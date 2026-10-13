/**
 * ASCENDIQ Year 4 Placement & Career Launch Client Service
 * Coordinates:
 * 1. Resume Builder & Algorithmic ATS Readiness Analysis
 * 2. AI Mock Interview Studio (STAR method, structured feedback, question bank)
 * 3. Placement Application Tracker (multi-stage pipeline, deadlines, resumes used)
 * 4. Placement Readiness Score (5-component transparent model, missing-data aware)
 * 5. Personalized Career Action Plan (prioritized weekly plan, completion tracking)
 * 6. Company & Role Specific Preparation Engine (connects with Year 2 dream roadmap & Year 3 assessments)
 * 7. Offer & Placement Outcome Tracker (private compensation fields, status tracking)
 */

import { supabase } from './supabase.ts'

// ==============================================================================
// Types and Interfaces
// ==============================================================================

export interface ResumeEducation {
  institution: string
  degree: string
  field_of_study: string
  start_year: string
  end_year: string
  grade_or_cgpa: string
}

export interface ResumeProject {
  title: string
  technologies: string[]
  live_url?: string
  github_url?: string
  description?: string
  bullets: string[]
}

export interface ResumeExperience {
  company: string
  role: string
  location?: string
  start_date: string
  end_date: string
  bullets: string[]
}

export interface AtsBreakdown {
  ats_score_estimate: number
  missing_sections: string[]
  weak_bullet_points: string[]
  strong_bullet_points: string[]
  metric_indicators_found: number
  matched_job_keywords: string[]
  unmatched_job_keywords?: string[]
  actionable_feedback: string[]
  criteria_explanation: string
}

export interface StudentResume {
  id: string
  student_id: string
  title: string
  target_role: string
  file_url?: string
  file_name?: string
  file_size?: number
  education: ResumeEducation[]
  skills: string[]
  projects: ResumeProject[]
  experience: ResumeExperience[]
  certifications: string[]
  achievements: string[]
  is_primary: boolean
  ats_score_estimate: number
  ats_breakdown: AtsBreakdown
  created_at: string
  updated_at: string
}

export interface MasterInterviewQuestion {
  id: string
  category: 'hr_behavioral' | 'technical_cs' | 'role_specific' | 'company_focused'
  competency: string
  question_text: string
  framework: string
  sample_structure: string
}

export interface InterviewFeedback {
  score: number
  relevance: number
  clarity: number
  completeness: number
  technical_accuracy: number
  strengths: string[]
  improvements: string[]
  suggested_structure: string
}

export interface InterviewAnswerRecord {
  answer_text: string
  feedback: InterviewFeedback
  submitted_at: string
}

export interface MockInterviewSession {
  id: string
  student_id: string
  interview_type: 'hr_behavioral' | 'technical_cs' | 'role_specific' | 'company_focused'
  target_company?: string
  target_role?: string
  status: 'in_progress' | 'completed'
  questions: MasterInterviewQuestion[]
  answers: Record<string, InterviewAnswerRecord>
  overall_score: number | null
  overall_feedback?: Record<string, any> | null
  started_at: string
  completed_at?: string | null
}

export type ApplicationStatus =
  | 'Interested'
  | 'Preparing'
  | 'Applied'
  | 'Online Assessment'
  | 'Interview'
  | 'Offer Received'
  | 'Rejected'
  | 'Withdrawn'

export interface PlacementApplication {
  id: string
  student_id: string
  company_name: string
  job_title: string
  job_link?: string
  application_date: string
  status: ApplicationStatus
  deadline?: string
  interview_date?: string
  resume_version_id?: string
  resume_title?: string
  notes?: string
  next_action?: string
  created_at: string
  updated_at: string
}

export interface ReadinessScoreComponent {
  name: string
  weight: number
  score: number | null
  status: 'Assessed' | 'Not assessed'
  evidence: string
}

export interface PlacementReadinessScore {
  student_id: string
  overall_score: number | null
  readiness_status: string
  available_weight_assessed: number
  components: {
    resume_readiness: ReadinessScoreComponent
    technical_assessment: ReadinessScoreComponent
    aptitude_assessment: ReadinessScoreComponent
    interview_practice: ReadinessScoreComponent
    skills_project_evidence: ReadinessScoreComponent
  }
  explanation: string
  disclaimer: string
  last_updated: string
}

export interface CareerActionPlanTask {
  id: string
  student_id: string
  title: string
  explanation: string
  priority: 'High' | 'Medium' | 'Low'
  due_date?: string
  is_completed: boolean
  completed_at?: string | null
  related_component: 'resume' | 'technical' | 'aptitude' | 'interview' | 'skills'
  notes?: string
  is_ai_recommended: boolean
  created_at: string
}

export type OfferOutcomeStatus =
  | 'Under Consideration'
  | 'Accepted'
  | 'Declined'
  | 'Deferred'

export interface PlacementOffer {
  id: string
  student_id: string
  company_name: string
  role_title: string
  offer_date: string
  outcome_status: OfferOutcomeStatus
  compensation_details?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface CompanyPrepPillar {
  category: string
  status: string
  summary: string
  verified_level: string
  recommended_action: string
}

export interface CompanyPrepOverview {
  student_id: string
  target_company: string
  target_role: string
  prep_pillars: CompanyPrepPillar[]
}

// Master Question Catalog
export const MASTER_INTERVIEW_QUESTIONS: MasterInterviewQuestion[] = [
  {
    id: 'hr-q1',
    category: 'hr_behavioral',
    competency: 'Conflict Resolution & Teamwork',
    question_text: 'Tell me about a situation where you had a serious technical disagreement with a team member on a project. How did you resolve it, and what was the outcome?',
    framework: 'STAR (Situation, Task, Action, Result)',
    sample_structure: '1. Situation: Describe project context and specific architectural or technical conflict.\n2. Task: Explain your role and mutual deadline goal.\n3. Action: Objective benchmarks or code spikes used to evaluate tradeoffs without interpersonal friction.\n4. Result: Selected solution and project delivery impact.'
  },
  {
    id: 'hr-q2',
    category: 'hr_behavioral',
    competency: 'Overcoming Failure & Resilience',
    question_text: 'Describe a scenario where a project or release you were responsible for failed or missed a critical deliverable. What went wrong and what steps did you take to prevent recurrence?',
    framework: 'Accountability & Post-Mortem Analysis',
    sample_structure: '1. Honest acknowledgment of the failure.\n2. Root-cause analysis (e.g. unhandled edge-case, scope creep).\n3. Immediate mitigation deployed.\n4. Systemic long-term preventive safeguards implemented (e.g. automated tests, CI gates).'
  },
  {
    id: 'hr-q3',
    category: 'hr_behavioral',
    competency: 'Prioritization & Time Management',
    question_text: 'How do you manage tight academic deadlines when an unexpected high-severity bug or urgent requirement emerges simultaneously in your capstone project?',
    framework: 'Eisenhower Matrix & Stakeholder Communication',
    sample_structure: '1. Triage by impact vs urgency.\n2. Transparent communication with team / faculty mentor.\n3. Time-boxed delegation or scoped minimum viable deliverable.\n4. Retrospective on buffering future milestones.'
  },
  {
    id: 'tech-q1',
    category: 'technical_cs',
    competency: 'System Architecture & Caching',
    question_text: 'Explain how you would design a cache eviction policy in an API with strict latency limits. When would you choose an LRU cache over an LFU cache, and what data structures would you use to implement LRU in O(1) time?',
    framework: 'Algorithmic Complexity & Tradeoff Analysis',
    sample_structure: '1. Complexity requirement: O(1) get and put operations.\n2. Data structures: Doubly Linked List paired with a Hash Map.\n3. Tradeoff analysis: LRU handles temporal locality; LFU is susceptible to stale frequency bursts unless aging is added.\n4. Concurrency or memory limits to consider.'
  },
  {
    id: 'tech-q2',
    category: 'technical_cs',
    competency: 'Database Transactions & ACID',
    question_text: 'What is the difference between Optimistic Concurrency Control (OCC) and Pessimistic Locking in database transactions? In a high-throughput seat booking system, which would you select and why?',
    framework: 'Concurrency Models & Throughput Optimization',
    sample_structure: '1. Definitions: OCC assumes rare conflicts using version timestamps; Pessimistic lock acquires exclusive lock upfront.\n2. Workload characteristic: Seat booking involves intense contention on identical row IDs.\n3. Selection rationale: Pessimistic locking (SELECT FOR UPDATE) prevents cascading rollbacks and guarantees inventory atomicity.\n4. Deadlock prevention strategy.'
  },
  {
    id: 'tech-q3',
    category: 'technical_cs',
    competency: 'Network Protocols & Reliability',
    question_text: 'Walk through the exact mechanics of a TCP 3-way handshake. How does TCP guarantee reliable in-order data delivery over an unreliable IP network layer?',
    framework: 'Protocol Verification & State Machine',
    sample_structure: '1. Handshake phases: SYN -> SYN-ACK -> ACK with initial sequence numbers.\n2. Reliability mechanisms: Sequence numbers, cumulative ACKs, sliding window flow control.\n3. Recovery: Retransmission timers (RTO), fast retransmit via duplicate ACKs.\n4. Congestion avoidance algorithms (e.g. slow start, AIMD).'
  },
  {
    id: 'role-q1',
    category: 'role_specific',
    competency: 'Frontend Performance & Hydration',
    question_text: 'How does React\'s virtual DOM reconciliation algorithm work, and what specific steps do you take to eliminate unnecessary component re-renders in complex dashboards?',
    framework: 'Fiber Tree Diffing & Memoization',
    sample_structure: '1. Heuristic diffing algorithm: Key prop stability and component type identity.\n2. Profiling tools: React DevTools flamegraphs.\n3. Memoization strategies: useMemo, useCallback, React.memo, and state localization.\n4. Architectural optimizations: Virtualized windowing for large lists.'
  },
  {
    id: 'role-q2',
    category: 'role_specific',
    competency: 'REST & API Design',
    question_text: 'What does idempotency mean in RESTful API design? Which HTTP methods are inherently idempotent, and how would you implement idempotency on a POST /checkout endpoint?',
    framework: 'API Robustness & Payment Engineering',
    sample_structure: '1. Definition: Multiple identical requests produce the same server-side outcome as a single request.\n2. Methods: GET, PUT, DELETE, HEAD, OPTIONS are idempotent; POST is not.\n3. Implementation: Client supplies a unique Idempotency-Key header; server caches response in Redis with a TTL.'
  },
  {
    id: 'comp-q1',
    category: 'company_focused',
    competency: 'Scalability & Distributed Systems',
    question_text: 'Suppose you are designing a URL shortener system handling 100 million redirects daily (e.g. Bit.ly or TinyURL for Google/Amazon scale). How do you generate unique short keys, and how do you optimize read latency?',
    framework: 'System Design: Capacity Estimation & Architecture',
    sample_structure: '1. Scale math: 100M reads/day is approx 1,200 QPS average, 3,000 QPS peak.\n2. Key generation: Base62 encoding of an auto-incrementing 64-bit ID or distributed token-range service.\n3. Storage: NoSQL key-value store partitioned by short_hash.\n4. Caching: Redis cluster caching top 20% URLs (Pareto distribution) to serve 80% reads in sub-5ms.'
  }
]

// Strong action verbs for ATS
const STRONG_ACTION_VERBS = new Set([
  'architected', 'engineered', 'implemented', 'optimized', 'developed',
  'deployed', 'orchestrated', 'designed', 'streamlined', 'automated',
  'spearheaded', 'refactored', 'analyzed', 'reduced', 'increased',
  'built', 'configured', 'integrated', 'benchmarked', 'executed'
])

const WEAK_ACTION_VERBS = [
  'worked on', 'assisted with', 'helped', 'responsible for', 'participated in',
  'familiar with', 'did', 'handled', 'tried', 'contributed to'
]

const METRIC_PATTERNS = [
  /\b\d+%/,
  /\b\d+\s*(?:ms|seconds|minutes|hours)\b/,
  /\b\d+(?:\.\d+)?x\b/,
  /\b\d+(?:,\d{3})*\+?\s*(?:users|requests|records|queries|qps)\b/,
  /(?:\$|₹)\s*\d+/,
  /\b\d+\s*(?:gb|mb|tb|k)\b/
]

// ==============================================================================
// In-Memory / Local Storage Fallback Store
// ==============================================================================

const memoryResumes = new Map<string, StudentResume[]>()
const memoryInterviews = new Map<string, MockInterviewSession[]>()
const memoryApplications = new Map<string, PlacementApplication[]>()
const memoryActionPlans = new Map<string, CareerActionPlanTask[]>()
const memoryOffers = new Map<string, PlacementOffer[]>()

function getLocalOrMemory<T>(key: string, memoryMap: Map<string, T[]>, studentId: string): T[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(`ascendiq_${key}_${studentId}`)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
  }
  return memoryMap.get(studentId) || []
}

function saveLocalOrMemory<T>(key: string, memoryMap: Map<string, T[]>, studentId: string, data: T[]) {
  memoryMap.set(studentId, data)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(`ascendiq_${key}_${studentId}`, JSON.stringify(data))
    } catch {
      // ignore
    }
  }
}

// Initial demo seeding for student STU-CS-101 (Priya Sharma)
function initializeDefaultDemoRecords(studentId: string) {
  if (studentId !== 'STU-CS-101') return
  if (memoryResumes.has(studentId) && memoryResumes.get(studentId)!.length > 0) return

  const initialResume: StudentResume = {
    id: `res-primary-${studentId}`,
    student_id: studentId,
    title: 'Software Development Engineer (Full Stack & Systems)',
    target_role: 'Full Stack Software Engineer',
    file_name: 'Priya_Sharma_Resume_2026.pdf',
    file_size: 148200,
    is_primary: true,
    education: [
      {
        institution: 'National Institute of Technology',
        degree: 'Bachelor of Technology',
        field_of_study: 'Computer Science & Engineering',
        start_year: '2023',
        end_year: '2027',
        grade_or_cgpa: '8.92 CGPA'
      }
    ],
    skills: [
      'Data Structures & Algorithms',
      'TypeScript',
      'React',
      'Python',
      'FastAPI',
      'PostgreSQL',
      'Docker',
      'Redis',
      'Git & GitHub'
    ],
    projects: [
      {
        title: 'ASCENDIQ Campus Analytics Platform',
        technologies: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL'],
        bullets: [
          'Architected real-time institutional analytics dashboard handling 10,000+ student records with sub-100ms response times.',
          'Engineered explainable student risk classification engine reducing student attrition warnings by 35%.',
          'Optimized database queries with composite B-tree indexes, improving query throughput by 4.2x.'
        ]
      },
      {
        title: 'Distributed Rate Limiter & Token Bucket',
        technologies: ['Python', 'Redis', 'Docker'],
        bullets: [
          'Implemented distributed sliding-window log rate limiter supporting 5,000 QPS with Redis atomic scripts.',
          'Benchmarked latency overhead below 2ms under concurrent stress testing with Locust.'
        ]
      }
    ],
    experience: [
      {
        company: 'CloudScale Technologies',
        role: 'Software Engineering Intern',
        start_date: 'May 2025',
        end_date: 'July 2025',
        bullets: [
          'Streamlined microservice CI/CD deployment pipelines on AWS ECS, reducing deployment latency by 45%.',
          'Automated health check probes and telemetry metrics across 12 microservices.'
        ]
      }
    ],
    certifications: [
      'AWS Certified Cloud Practitioner',
      'Meta Front-End Developer Professional Certificate'
    ],
    achievements: [
      'Top 5% in National Inter-Collegiate Algorithmic Hackathon 2025',
      'Dean’s List Academic Honor Roll for Semesters 1 through 6'
    ],
    ats_score_estimate: 91.5,
    ats_breakdown: {
      ats_score_estimate: 91.5,
      missing_sections: [],
      weak_bullet_points: [],
      strong_bullet_points: [
        'Architected real-time institutional analytics dashboard handling 10,000+ student records with sub-100ms response times.',
        'Optimized database queries with composite B-tree indexes, improving query throughput by 4.2x.'
      ],
      metric_indicators_found: 5,
      matched_job_keywords: ['python', 'react', 'typescript', 'sql', 'docker', 'redis', 'git'],
      actionable_feedback: [
        'Resume shows strong metric indicators and high action verb density.',
        'Target role keywords well represented across projects and internships.'
      ],
      criteria_explanation: 'ATS Readiness evaluates structural completeness (30%), action verbs & metrics (35%), skills inventory (15%), and keyword alignment (20%).'
    },
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
  }

  saveLocalOrMemory('resumes', memoryResumes, studentId, [initialResume])

  // Initial Applications
  const initialApps: PlacementApplication[] = [
    {
      id: 'app-1',
      student_id: studentId,
      company_name: 'Google',
      job_title: 'Software Engineer - University Graduate',
      job_link: 'https://careers.google.com/jobs/results/swe-grad',
      application_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
      status: 'Interview',
      deadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      interview_date: new Date(Date.now() + 4 * 86400000).toISOString(),
      resume_version_id: initialResume.id,
      resume_title: initialResume.title,
      notes: 'Cleared initial technical phone screen on DSA and graphs. Round 2: System Design & Coding scheduled.',
      next_action: 'Review distributed caching and LRU implementation details.',
      created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    {
      id: 'app-2',
      student_id: studentId,
      company_name: 'Microsoft',
      job_title: 'Software Development Engineer (SDE-1)',
      job_link: 'https://careers.microsoft.com/us/en/sde1',
      application_date: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
      status: 'Online Assessment',
      deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      resume_version_id: initialResume.id,
      resume_title: initialResume.title,
      notes: 'Online Coding Assessment link received (Codility - 3 algorithmic questions in 90 mins).',
      next_action: 'Complete assessment before Friday 11:59 PM.',
      created_at: new Date(Date.now() - 16 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    {
      id: 'app-3',
      student_id: studentId,
      company_name: 'Amazon',
      job_title: 'SDE-1 (AWS Cloud Services)',
      job_link: 'https://amazon.jobs/en/jobs/sde1-aws',
      application_date: new Date(Date.now() - 25 * 86400000).toISOString().split('T')[0],
      status: 'Offer Received',
      interview_date: new Date(Date.now() - 5 * 86400000).toISOString(),
      resume_version_id: initialResume.id,
      resume_title: initialResume.title,
      notes: 'Final loop completed. Received official Letter of Intent from University Recruiting.',
      next_action: 'Evaluate offer letter compensation breakdown and start date.',
      created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: 'app-4',
      student_id: studentId,
      company_name: 'Cisco',
      job_title: 'Software Engineer - Core Networks',
      job_link: 'https://jobs.cisco.com/swe',
      application_date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
      status: 'Applied',
      deadline: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
      resume_version_id: initialResume.id,
      resume_title: initialResume.title,
      notes: 'Application submitted via on-campus recruitment portal.',
      next_action: 'Awaiting shortlist announcement from placement office.',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  ]
  saveLocalOrMemory('applications', memoryApplications, studentId, initialApps)

  // Initial Action Plans
  const initialActionPlans: CareerActionPlanTask[] = [
    {
      id: `cap-1-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Tailor Primary Resume for SDE-1 Systems Roles',
      explanation: 'Incorporate 3 measurable metric bullet points highlighting latency reduction or scalability.',
      priority: 'High',
      due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      is_completed: true,
      completed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      related_component: 'resume',
      notes: 'Added Redis atomic scripts and query throughput benchmarks.',
      is_ai_recommended: true,
      created_at: new Date(Date.now() - 5 * 86400000).toISOString()
    },
    {
      id: `cap-2-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Complete Full-Length Mock Placement Test',
      explanation: 'Simulate a timed screening test combining Quantitative Aptitude, Logical Reasoning, and DSA.',
      priority: 'High',
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      is_completed: false,
      related_component: 'technical',
      notes: 'Target cutoff is >= 75% for Tier-1 corporate screening.',
      is_ai_recommended: true,
      created_at: new Date(Date.now() - 4 * 86400000).toISOString()
    },
    {
      id: `cap-3-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Practice Behavioral Mock Interview (Conflict Resolution)',
      explanation: 'Answer the \'Technical Disagreement\' prompt using the STAR (Situation, Task, Action, Result) method.',
      priority: 'Medium',
      due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      is_completed: false,
      related_component: 'interview',
      notes: 'Review the feedback generated in the Mock Interview Studio.',
      is_ai_recommended: true,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    {
      id: `cap-4-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Review System Design & Caching Tradeoffs',
      explanation: 'Master LRU vs LFU cache eviction strategies and database transaction isolation levels.',
      priority: 'Medium',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      is_completed: true,
      completed_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      related_component: 'skills',
      notes: 'Key topic for Google Round 2 interview.',
      is_ai_recommended: true,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString()
    },
    {
      id: `cap-5-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Track 3 Active Campus Placement Drives in Tracker',
      explanation: 'Log application deadlines, interview dates, and target roles in the Placement Application Tracker.',
      priority: 'Low',
      due_date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      is_completed: true,
      completed_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      related_component: 'resume',
      notes: 'Tracking Google, Microsoft, Amazon, and Cisco.',
      is_ai_recommended: true,
      created_at: new Date(Date.now() - 7 * 86400000).toISOString()
    }
  ]
  saveLocalOrMemory('action_plans', memoryActionPlans, studentId, initialActionPlans)

  // Initial Offer
  const initialOffers: PlacementOffer[] = [
    {
      id: 'off-1',
      student_id: studentId,
      company_name: 'Amazon',
      role_title: 'Software Development Engineer - I',
      offer_date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
      outcome_status: 'Under Consideration',
      compensation_details: '₹22,50,000 CTC (Base ₹15,50,000 + ₹3,50,000 Signing Bonus + ₹3,50,000 Stock Grants)',
      notes: 'Offer letter received. Acceptance deadline is 15 days from issue date. Waiting on Google final round outcome.',
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 86400000).toISOString()
    }
  ]
  saveLocalOrMemory('offers', memoryOffers, studentId, initialOffers)
}

// ==============================================================================
// Client-Side ATS Analyzer (Algorithmic & Missing-Data Aware)
// ==============================================================================

export function analyzeResumeAtsClient(
  sections: {
    education?: ResumeEducation[]
    skills?: string[]
    projects?: ResumeProject[]
    experience?: ResumeExperience[]
    certifications?: string[]
    achievements?: string[]
  },
  jobDescription?: string
): AtsBreakdown {
  let score = 0.0
  const missing_sections: string[] = []
  const weak_bullet_points: string[] = []
  const strong_bullet_points: string[] = []
  const actionable_feedback: string[] = []
  let matched_job_keywords: string[] = []
  let unmatched_job_keywords: string[] = []

  // 1. Completeness (30 pts max)
  const education = sections.education || []
  const skills = sections.skills || []
  const projects = sections.projects || []
  const experience = sections.experience || []

  if (education.length > 0) score += 8.0
  else missing_sections.push('Education Section')

  if (skills.length > 0) score += 8.0
  else missing_sections.push('Technical Skills Section')

  if (projects.length > 0) score += 8.0
  else missing_sections.push('Projects Section')

  if (experience.length > 0) score += 6.0
  else missing_sections.push('Work Experience / Internships')

  // 2. Bullets & Metrics (35 pts max)
  const allBullets: string[] = []
  for (const p of projects) {
    if (p.bullets) allBullets.push(...p.bullets)
    else if (p.description) allBullets.push(p.description)
  }
  for (const exp of experience) {
    if (exp.bullets) allBullets.push(...exp.bullets)
  }

  let metricCount = 0
  let strongVerbCount = 0

  for (const bullet of allBullets) {
    const lower = bullet.toLowerCase().trim()
    const hasStrong = Array.from(STRONG_ACTION_VERBS).some(v => lower.startsWith(v) || lower.includes(` ${v} `))
    const hasWeak = WEAK_ACTION_VERBS.some(v => lower.includes(v))
    const hasMetric = METRIC_PATTERNS.some(pat => pat.test(lower))

    if (hasStrong) {
      strongVerbCount++
      if (!strong_bullet_points.includes(bullet) && strong_bullet_points.length < 3) {
        strong_bullet_points.push(bullet)
      }
    } else if (hasWeak || lower.split(' ').length < 6) {
      if (!weak_bullet_points.includes(bullet) && weak_bullet_points.length < 3) {
        weak_bullet_points.push(bullet)
      }
    }

    if (hasMetric) {
      metricCount++
    }
  }

  if (allBullets.length > 0) {
    const strongRatio = Math.min(1.0, strongVerbCount / allBullets.length)
    score += strongRatio * 15.0
  } else {
    score += 2.0
  }

  if (metricCount >= 3) {
    score += 20.0
  } else if (metricCount >= 1) {
    score += 12.0
  } else {
    score += 4.0
    actionable_feedback.push('Include quantifiable outcomes in your project bullet points (e.g. latency, throughput, scale, accuracy %).')
  }

  // 3. Skills count (15 pts max)
  if (skills.length >= 8) score += 15.0
  else if (skills.length >= 4) score += 10.0
  else if (skills.length >= 1) score += 6.0

  // 4. Job Description Keyword Matching (20 pts max)
  if (jobDescription && jobDescription.trim()) {
    const jdLower = jobDescription.toLowerCase()
    const techLexicon = [
      'python', 'java', 'c++', 'react', 'typescript', 'javascript', 'sql', 'postgresql',
      'docker', 'kubernetes', 'aws', 'git', 'rest', 'graphql', 'redis', 'linux', 'ci/cd',
      'algorithms', 'system design', 'microservices', 'html', 'css', 'node.js', 'django', 'fastapi'
    ]
    const jdKeywords = techLexicon.filter(kw => jdLower.includes(kw))
    const resumeText = (allBullets.join(' ') + ' ' + skills.join(' ')).toLowerCase()

    matched_job_keywords = jdKeywords.filter(kw => resumeText.includes(kw))
    unmatched_job_keywords = jdKeywords.filter(kw => !resumeText.includes(kw))

    if (jdKeywords.length > 0) {
      const matchRatio = matched_job_keywords.length / jdKeywords.length
      score += matchRatio * 20.0
      if (unmatched_job_keywords.length > 0) {
        actionable_feedback.push(`Target role keywords missing from resume: ${unmatched_job_keywords.slice(0, 5).join(', ')}.`)
      }
    } else {
      score += 15.0
    }
  } else {
    score += 16.0
  }

  const finalScore = Math.round(Math.min(100.0, Math.max(0.0, score)) * 10) / 10

  if (weak_bullet_points.length > 0) {
    actionable_feedback.push("Replace passive phrasing ('worked on', 'assisted with') with strong impact action verbs ('architected', 'benchmarked', 'optimized').")
  }

  if (missing_sections.length > 0) {
    actionable_feedback.push(`Missing core resume sections: ${missing_sections.join(', ')}.`)
  }

  return {
    ats_score_estimate: finalScore,
    missing_sections,
    weak_bullet_points,
    strong_bullet_points,
    metric_indicators_found: metricCount,
    matched_job_keywords,
    unmatched_job_keywords,
    actionable_feedback,
    criteria_explanation: 'ATS Readiness is an algorithmic estimate evaluating section completeness (30%), action verbs and measurable impact metrics (35%), skills inventory (15%), and keyword alignment (20%). It does not guarantee recruiter selection.'
  }
}

// ==============================================================================
// Client-Side Mock Interview Evaluator
// ==============================================================================

export function evaluateInterviewAnswerClient(
  questionId: string,
  answerText: string
): InterviewFeedback {
  const clean = answerText.trim()
  const words = clean.split(/\s+/).filter(Boolean)
  const wordCount = words.length

  if (wordCount < 10) {
    return {
      score: 30.0,
      relevance: 40.0,
      clarity: 50.0,
      completeness: 20.0,
      technical_accuracy: 30.0,
      strengths: ['Initial attempt submitted.'],
      improvements: [
        'Answer is too brief. Elaborate with concrete architectural steps or project circumstances.',
        'Structure your response using the STAR method (Situation, Task, Action, Result).'
      ],
      suggested_structure: 'Provide context, state specific technical actions taken, and conclude with measurable impact.'
    }
  }

  const relevance = Math.min(95.0, 60.0 + Math.min(35.0, wordCount * 0.5))
  const clarity = /[.;:\n]/.test(clean) ? 82.0 : 65.0
  const completeness = Math.min(95.0, 55.0 + Math.min(40.0, wordCount * 0.45))
  const hasTech = /(complexity|latency|index|tradeoff|cache|hash|scale|concurrency|star|situation|task|action|result|test|database|api)/i.test(clean)
  const technicalAccuracy = hasTech ? 88.0 : 68.0

  const overall = Math.round((relevance * 0.3 + clarity * 0.2 + completeness * 0.25 + technicalAccuracy * 0.25) * 10) / 10

  const strengths: string[] = []
  const improvements: string[] = []

  if (wordCount >= 50) {
    strengths.push('Thorough depth and detailed technical explanation provided.')
  } else {
    improvements.push('Expand on specific challenges faced during implementation.')
  }

  if (METRIC_PATTERNS.some(pat => pat.test(clean))) {
    strengths.push('Strong usage of quantifiable metrics and outcomes.')
  } else {
    improvements.push('Include specific measurable results (e.g. reduced response time by 40%, supported 1,000 active users).')
  }

  if (technicalAccuracy >= 75.0) {
    strengths.push('Sound understanding of core engineering principles and terminology.')
  } else {
    improvements.push('Clarify the architectural or theoretical tradeoffs behind your chosen approach.')
  }

  const masterQ = MASTER_INTERVIEW_QUESTIONS.find(q => q.id === questionId)
  const suggestedStructure = masterQ?.sample_structure || '1. State problem context.\n2. Detail action.\n3. Quantify result.'

  return {
    score: overall,
    relevance: Math.round(relevance * 10) / 10,
    clarity: Math.round(clarity * 10) / 10,
    completeness: Math.round(completeness * 10) / 10,
    technical_accuracy: Math.round(technicalAccuracy * 10) / 10,
    strengths,
    improvements,
    suggested_structure: suggestedStructure
  }
}

// ==============================================================================
// Placement Readiness Score Calculator (100% Total, Missing-Data Aware)
// ==============================================================================

export function calculatePlacementReadinessScoreClient(
  studentId: string,
  resumeScore?: number | null,
  techScore?: number | null,
  aptScore?: number | null,
  interviewScore?: number | null,
  skillsScore?: number | null
): PlacementReadinessScore {
  const components: PlacementReadinessScore['components'] = {
    resume_readiness: {
      name: 'Resume & ATS Readiness',
      weight: 20,
      score: resumeScore !== undefined ? resumeScore : null,
      status: resumeScore !== undefined && resumeScore !== null ? 'Assessed' : 'Not assessed',
      evidence: resumeScore !== undefined && resumeScore !== null ? `Latest ATS score estimate from Primary Resume (${resumeScore}%)` : 'No verified resume analyzed yet'
    },
    technical_assessment: {
      name: 'Technical Assessment Performance',
      weight: 25,
      score: techScore !== undefined ? techScore : null,
      status: techScore !== undefined && techScore !== null ? 'Assessed' : 'Not assessed',
      evidence: techScore !== undefined && techScore !== null ? `Year 3 Technical Tests average (${techScore}%)` : 'No technical assessment completed'
    },
    aptitude_assessment: {
      name: 'Aptitude & Problem Solving',
      weight: 15,
      score: aptScore !== undefined ? aptScore : null,
      status: aptScore !== undefined && aptScore !== null ? 'Assessed' : 'Not assessed',
      evidence: aptScore !== undefined && aptScore !== null ? `Year 3 Aptitude Tests average (${aptScore}%)` : 'No aptitude assessment completed'
    },
    interview_practice: {
      name: 'Mock Interview Mastery',
      weight: 20,
      score: interviewScore !== undefined ? interviewScore : null,
      status: interviewScore !== undefined && interviewScore !== null ? 'Assessed' : 'Not assessed',
      evidence: interviewScore !== undefined && interviewScore !== null ? `Mock Interview Studio sessions evaluated (${interviewScore}%)` : 'No mock interviews recorded'
    },
    skills_project_evidence: {
      name: 'Verified Skills & Portfolio Evidence',
      weight: 20,
      score: skillsScore !== undefined ? skillsScore : null,
      status: skillsScore !== undefined && skillsScore !== null ? 'Assessed' : 'Not assessed',
      evidence: skillsScore !== undefined && skillsScore !== null ? `Verified project code & technical certifications (${skillsScore}%)` : 'Project code & credentials pending review'
    }
  }

  let availableWeight = 0
  let weightedSum = 0.0

  for (const comp of Object.values(components)) {
    if (comp.score !== null && comp.score !== undefined) {
      availableWeight += comp.weight
      weightedSum += comp.score * (comp.weight / 100.0)
    }
  }

  let overallScore: number | null = null
  let readinessStatus = 'Incomplete Assessment'
  let explanation = 'No placement components have been assessed yet. Complete a resume review or assessment to unlock your readiness estimate.'

  if (availableWeight > 0) {
    const normalized = Math.round((weightedSum / (availableWeight / 100.0)) * 10) / 10
    overallScore = normalized

    if (normalized >= 80.0) readinessStatus = 'Tier-1 Placement Ready'
    else if (normalized >= 65.0) readinessStatus = 'Tier-2 Core Ready'
    else if (normalized >= 50.0) readinessStatus = 'Foundation Established'
    else readinessStatus = 'Preparation Recommended'

    explanation = `Based on ${availableWeight}% assessed components across institutional benchmarks. Missing components are marked 'Not assessed' and not penalized as zero.`
  }

  return {
    student_id: studentId,
    overall_score: overallScore,
    readiness_status: readinessStatus,
    available_weight_assessed: availableWeight,
    components,
    explanation,
    disclaimer: 'This readiness score is an explainable analytical preparation benchmark and does not constitute a legal or contractual guarantee of employment.',
    last_updated: new Date().toISOString()
  }
}

// ==============================================================================
// Service API Exported Methods
// ==============================================================================


export function generateDefaultActionPlanClient(studentId: string): CareerActionPlanTask[] {
  const today = new Date()
  return [
    {
      id: `cap-1-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Tailor Primary Resume for SDE-1 Systems Roles',
      explanation: 'Incorporate 3 measurable metric bullet points highlighting latency reduction or scalability.',
      priority: 'High',
      due_date: new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0],
      is_completed: false,
      related_component: 'resume',
      notes: 'Added Redis atomic scripts and query throughput benchmarks.',
      is_ai_recommended: true,
      created_at: today.toISOString()
    },
    {
      id: `cap-2-${studentId.slice(0, 6)}`,
      student_id: studentId,
      title: 'Complete Full-Length Mock Placement Test',
      explanation: 'Simulate a timed screening test combining Quantitative Aptitude, Logical Reasoning, and DSA.',
      priority: 'High',
      due_date: new Date(today.getTime() + 4 * 86400000).toISOString().split('T')[0],
      is_completed: false,
      related_component: 'technical',
      notes: 'Target cutoff is >= 75% for Tier-1 corporate screening.',
      is_ai_recommended: true,
      created_at: today.toISOString()
    }
  ]
}

export const placementLaunchService = {
  // 1. Resumes
  async getStudentResumes(studentId: string = 'STU-CS-101'): Promise<StudentResume[]> {
    initializeDefaultDemoRecords(studentId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/resumes?student_id=${encodeURIComponent(studentId)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          saveLocalOrMemory('resumes', memoryResumes, studentId, data)
          return data
        }
      }
    } catch {
      // Backend offline, fallback to Supabase or local
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('student_resumes')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          return data as StudentResume[]
        }
      } catch {
        // ignore
      }
    }

    return getLocalOrMemory<StudentResume>('resumes', memoryResumes, studentId)
  },

  async saveResume(
    studentId: string,
    resumeData: Partial<StudentResume> & { title: string; target_role: string },
    jobDescription?: string
  ): Promise<StudentResume> {
    initializeDefaultDemoRecords(studentId)

    // Compute ATS breakdown
    const atsResult = analyzeResumeAtsClient({
      education: resumeData.education || [],
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      experience: resumeData.experience || [],
      certifications: resumeData.certifications || [],
      achievements: resumeData.achievements || []
    }, jobDescription)

    const resumeId = resumeData.id || `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const existing = getLocalOrMemory<StudentResume>('resumes', memoryResumes, studentId)
    const isFirst = existing.length === 0

    const record: StudentResume = {
      id: resumeId,
      student_id: studentId,
      title: resumeData.title,
      target_role: resumeData.target_role,
      file_url: resumeData.file_url,
      file_name: resumeData.file_name,
      file_size: resumeData.file_size,
      education: resumeData.education || [],
      skills: resumeData.skills || [],
      projects: resumeData.projects || [],
      experience: resumeData.experience || [],
      certifications: resumeData.certifications || [],
      achievements: resumeData.achievements || [],
      is_primary: resumeData.is_primary ?? isFirst,
      ats_score_estimate: atsResult.ats_score_estimate,
      ats_breakdown: atsResult,
      created_at: resumeData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Attempt FastAPI
    try {
      await fetch('http://127.0.0.1:8000/api/career-launch/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          id: record.id,
          title: record.title,
          target_role: record.target_role,
          file_url: record.file_url,
          file_name: record.file_name,
          file_size: record.file_size,
          education: record.education,
          skills: record.skills,
          projects: record.projects,
          experience: record.experience,
          certifications: record.certifications,
          achievements: record.achievements,
          is_primary: record.is_primary,
          job_description_match: jobDescription
        })
      })
    } catch {
      // ignore
    }

    // Persist locally
    const updated = existing.some(r => r.id === resumeId)
      ? existing.map(r => r.id === resumeId ? record : (record.is_primary ? { ...r, is_primary: false } : r))
      : [record, ...existing.map(r => record.is_primary ? { ...r, is_primary: false } : r)]

    saveLocalOrMemory('resumes', memoryResumes, studentId, updated)
    return record
  },

  async deleteResume(studentId: string, resumeId: string): Promise<boolean> {
    try {
      await fetch(`http://127.0.0.1:8000/api/career-launch/resumes/${resumeId}?student_id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      })
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<StudentResume>('resumes', memoryResumes, studentId)
    const filtered = current.filter(r => r.id !== resumeId)
    saveLocalOrMemory('resumes', memoryResumes, studentId, filtered)
    return true
  },

  // 2. Mock Interviews
  getInterviewQuestions(category?: string): MasterInterviewQuestion[] {
    if (category) {
      return MASTER_INTERVIEW_QUESTIONS.filter(q => q.category === category)
    }
    return MASTER_INTERVIEW_QUESTIONS
  },

  async getMockInterviews(studentId: string = 'STU-CS-101'): Promise<MockInterviewSession[]> {
    initializeDefaultDemoRecords(studentId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/interviews?student_id=${encodeURIComponent(studentId)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          saveLocalOrMemory('interviews', memoryInterviews, studentId, data)
          return data
        }
      }
    } catch {
      // ignore
    }

    return getLocalOrMemory<MockInterviewSession>('interviews', memoryInterviews, studentId)
  },

  async startMockInterview(
    studentId: string,
    interviewType: MockInterviewSession['interview_type'],
    targetCompany?: string,
    targetRole?: string
  ): Promise<MockInterviewSession> {
    initializeDefaultDemoRecords(studentId)

    // Select 3 questions
    const pool = MASTER_INTERVIEW_QUESTIONS.filter(q => q.category === interviewType)
    const questions = (pool.length > 0 ? pool : MASTER_INTERVIEW_QUESTIONS).slice(0, 3)

    const session: MockInterviewSession = {
      id: `int-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      student_id: studentId,
      interview_type: interviewType,
      target_company: targetCompany,
      target_role: targetRole,
      status: 'in_progress',
      questions,
      answers: {},
      overall_score: null,
      started_at: new Date().toISOString()
    }

    try {
      const res = await fetch('http://127.0.0.1:8000/api/career-launch/interviews/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          interview_type: interviewType,
          target_company: targetCompany,
          target_role: targetRole
        })
      })
      if (res.ok) {
        const remoteSession = await res.json()
        const current = getLocalOrMemory<MockInterviewSession>('interviews', memoryInterviews, studentId)
        saveLocalOrMemory('interviews', memoryInterviews, studentId, [remoteSession, ...current])
        return remoteSession
      }
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<MockInterviewSession>('interviews', memoryInterviews, studentId)
    saveLocalOrMemory('interviews', memoryInterviews, studentId, [session, ...current])
    return session
  },

  async submitInterviewAnswer(
    studentId: string,
    interviewId: string,
    questionId: string,
    answerText: string
  ): Promise<{ session: MockInterviewSession; feedback: InterviewFeedback }> {
    const feedback = evaluateInterviewAnswerClient(questionId, answerText)
    const currentSessions = getLocalOrMemory<MockInterviewSession>('interviews', memoryInterviews, studentId)
    const session = currentSessions.find(s => s.id === interviewId)

    if (!session) {
      throw new Error('Interview session not found')
    }

    session.answers[questionId] = {
      answer_text: answerText,
      feedback,
      submitted_at: new Date().toISOString()
    }

    // Check completion
    if (Object.keys(session.answers).length >= session.questions.length) {
      const scores = Object.values(session.answers).map(a => a.feedback.score)
      session.overall_score = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      session.status = 'completed'
      session.completed_at = new Date().toISOString()
    }

    try {
      await fetch(`http://127.0.0.1:8000/api/career-launch/interviews/${interviewId}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          question_id: questionId,
          answer_text: answerText
        })
      })
    } catch {
      // ignore
    }

    saveLocalOrMemory('interviews', memoryInterviews, studentId, currentSessions)
    return { session, feedback }
  },

  // 3. Placement Applications
  async getPlacementApplications(studentId: string = 'STU-CS-101'): Promise<PlacementApplication[]> {
    initializeDefaultDemoRecords(studentId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/applications?student_id=${encodeURIComponent(studentId)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          saveLocalOrMemory('applications', memoryApplications, studentId, data)
          return data
        }
      }
    } catch {
      // ignore
    }

    return getLocalOrMemory<PlacementApplication>('applications', memoryApplications, studentId)
  },

  async savePlacementApplication(
    studentId: string,
    appData: Partial<PlacementApplication> & { company_name: string; job_title: string }
  ): Promise<PlacementApplication> {
    initializeDefaultDemoRecords(studentId)
    const current = getLocalOrMemory<PlacementApplication>('applications', memoryApplications, studentId)
    const appId = appData.id || `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    const record: PlacementApplication = {
      id: appId,
      student_id: studentId,
      company_name: appData.company_name,
      job_title: appData.job_title,
      job_link: appData.job_link,
      application_date: appData.application_date || new Date().toISOString().split('T')[0],
      status: appData.status || 'Applied',
      deadline: appData.deadline,
      interview_date: appData.interview_date,
      resume_version_id: appData.resume_version_id,
      resume_title: appData.resume_title,
      notes: appData.notes,
      next_action: appData.next_action,
      created_at: appData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      await fetch('http://127.0.0.1:8000/api/career-launch/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      })
    } catch {
      // ignore
    }

    const updated = current.some(a => a.id === appId)
      ? current.map(a => a.id === appId ? record : a)
      : [record, ...current]

    saveLocalOrMemory('applications', memoryApplications, studentId, updated)
    return record
  },

  async deletePlacementApplication(studentId: string, applicationId: string): Promise<boolean> {
    try {
      await fetch(`http://127.0.0.1:8000/api/career-launch/applications/${applicationId}?student_id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      })
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<PlacementApplication>('applications', memoryApplications, studentId)
    const filtered = current.filter(a => a.id !== applicationId)
    saveLocalOrMemory('applications', memoryApplications, studentId, filtered)
    return true
  },

  // 4. Placement Readiness Score
  async getPlacementReadinessScore(
    studentId: string = 'STU-CS-101',
    techScoreOverride?: number | null,
    aptScoreOverride?: number | null,
    skillsScoreOverride?: number | null
  ): Promise<PlacementReadinessScore> {
    initializeDefaultDemoRecords(studentId)

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/readiness-score/${encodeURIComponent(studentId)}`)
      if (res.ok) {
        return await res.json()
      }
    } catch {
      // ignore
    }

    // Client calculation fallback
    const resumes = getLocalOrMemory<StudentResume>('resumes', memoryResumes, studentId)
    const primary = resumes.find(r => r.is_primary) || resumes[0]
    const resumeScore = primary ? primary.ats_score_estimate : null

    const interviews = getLocalOrMemory<MockInterviewSession>('interviews', memoryInterviews, studentId)
    const completed = interviews.filter(i => i.overall_score !== null)
    const interviewScore = completed.length > 0
      ? Math.round((completed.reduce((sum, i) => sum + (i.overall_score || 0), 0) / completed.length) * 10) / 10
      : null

    const techScore = techScoreOverride !== undefined ? techScoreOverride : 82.5
    const aptScore = aptScoreOverride !== undefined ? aptScoreOverride : 74.0
    const skillsScore = skillsScoreOverride !== undefined ? skillsScoreOverride : 85.0

    return calculatePlacementReadinessScoreClient(
      studentId,
      resumeScore,
      techScore,
      aptScore,
      interviewScore,
      skillsScore
    )
  },

  // 5. Career Action Plan
  async getCareerActionPlan(studentId: string = 'STU-CS-101'): Promise<CareerActionPlanTask[]> {
    initializeDefaultDemoRecords(studentId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/action-plan/${encodeURIComponent(studentId)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          saveLocalOrMemory('action_plans', memoryActionPlans, studentId, data)
          return data
        }
      }
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<CareerActionPlanTask>('action_plans', memoryActionPlans, studentId)
    if (current.length === 0) {
      const defaults = generateDefaultActionPlanClient(studentId)
      saveLocalOrMemory('action_plans', memoryActionPlans, studentId, defaults)
      return defaults
    }
    return current
  },

  async addActionPlanTask(
    studentId: string,
    taskData: {
      title: string
      explanation: string
      priority: 'High' | 'Medium' | 'Low'
      due_date?: string
      related_component: CareerActionPlanTask['related_component']
      notes?: string
    }
  ): Promise<CareerActionPlanTask> {
    initializeDefaultDemoRecords(studentId)
    const taskId = `cap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    const record: CareerActionPlanTask = {
      id: taskId,
      student_id: studentId,
      title: taskData.title,
      explanation: taskData.explanation,
      priority: taskData.priority,
      due_date: taskData.due_date,
      is_completed: false,
      related_component: taskData.related_component,
      notes: taskData.notes,
      is_ai_recommended: false,
      created_at: new Date().toISOString()
    }

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/action-plan/${encodeURIComponent(studentId)}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      })
      if (res.ok) {
        const saved = await res.json()
        const current = getLocalOrMemory<CareerActionPlanTask>('action_plans', memoryActionPlans, studentId)
        saveLocalOrMemory('action_plans', memoryActionPlans, studentId, [saved, ...current])
        return saved
      }
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<CareerActionPlanTask>('action_plans', memoryActionPlans, studentId)
    saveLocalOrMemory('action_plans', memoryActionPlans, studentId, [record, ...current])
    return record
  },

  async toggleActionPlanTask(studentId: string, taskId: string): Promise<CareerActionPlanTask | null> {
    const current = getLocalOrMemory<CareerActionPlanTask>('action_plans', memoryActionPlans, studentId)
    const task = current.find(t => t.id === taskId)
    if (!task) return null

    task.is_completed = !task.is_completed
    task.completed_at = task.is_completed ? new Date().toISOString() : null

    try {
      await fetch(`http://127.0.0.1:8000/api/career-launch/action-plan/${encodeURIComponent(studentId)}/task/${encodeURIComponent(taskId)}/toggle`, {
        method: 'PUT'
      })
    } catch {
      // ignore
    }

    saveLocalOrMemory('action_plans', memoryActionPlans, studentId, current)
    return task
  },

  async deleteActionPlanTask(studentId: string, taskId: string): Promise<boolean> {
    const current = getLocalOrMemory<CareerActionPlanTask>('action_plans', memoryActionPlans, studentId)
    const filtered = current.filter(t => t.id !== taskId)
    saveLocalOrMemory('action_plans', memoryActionPlans, studentId, filtered)
    return true
  },

  // 6. Placement Offers
  async getPlacementOffers(studentId: string = 'STU-CS-101'): Promise<PlacementOffer[]> {
    initializeDefaultDemoRecords(studentId)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/career-launch/offers/${encodeURIComponent(studentId)}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          saveLocalOrMemory('offers', memoryOffers, studentId, data)
          return data
        }
      }
    } catch {
      // ignore
    }

    return getLocalOrMemory<PlacementOffer>('offers', memoryOffers, studentId)
  },

  async savePlacementOffer(
    studentId: string,
    offerData: Partial<PlacementOffer> & { company_name: string; role_title: string }
  ): Promise<PlacementOffer> {
    initializeDefaultDemoRecords(studentId)
    const current = getLocalOrMemory<PlacementOffer>('offers', memoryOffers, studentId)
    const offerId = offerData.id || `off-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

    const record: PlacementOffer = {
      id: offerId,
      student_id: studentId,
      company_name: offerData.company_name,
      role_title: offerData.role_title,
      offer_date: offerData.offer_date || new Date().toISOString().split('T')[0],
      outcome_status: offerData.outcome_status || 'Under Consideration',
      compensation_details: offerData.compensation_details,
      notes: offerData.notes,
      created_at: offerData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    try {
      await fetch('http://127.0.0.1:8000/api/career-launch/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      })
    } catch {
      // ignore
    }

    const updated = current.some(o => o.id === offerId)
      ? current.map(o => o.id === offerId ? record : o)
      : [record, ...current]

    saveLocalOrMemory('offers', memoryOffers, studentId, updated)
    return record
  },

  async deletePlacementOffer(studentId: string, offerId: string): Promise<boolean> {
    try {
      await fetch(`http://127.0.0.1:8000/api/career-launch/offers/${offerId}?student_id=${encodeURIComponent(studentId)}`, {
        method: 'DELETE'
      })
    } catch {
      // ignore
    }

    const current = getLocalOrMemory<PlacementOffer>('offers', memoryOffers, studentId)
    const filtered = current.filter(o => o.id !== offerId)
    saveLocalOrMemory('offers', memoryOffers, studentId, filtered)
    return true
  },

  // 7. Company & Job Prep Overview
  async getCompanyPrepOverview(studentId: string = 'STU-CS-101', targetCompany?: string, targetRole?: string): Promise<CompanyPrepOverview> {
    initializeDefaultDemoRecords(studentId)
    const company = targetCompany || 'Google'
    const role = targetRole || 'Full Stack Software Engineer'

    return {
      student_id: studentId,
      target_company: company,
      target_role: role,
      prep_pillars: [
        {
          category: 'Required Technical Skills',
          status: 'In Progress (82% Verified)',
          summary: `Core Data Structures, System Architecture, REST API design, and Database indexing required by ${company}.`,
          verified_level: 'Intermediate - Advanced',
          recommended_action: 'Complete advanced System Design case studies on Caching and Concurrency.'
        },
        {
          category: 'Data Structures & Algorithms',
          status: 'Diagnostic Passed (Top 15%)',
          summary: 'Array two-pointers, sliding window, binary search trees, and dynamic programming.',
          verified_level: 'Advanced',
          recommended_action: `Solve 3 medium LeetCode/HackerRank problems weekly matching ${company}'s recurring patterns.`
        },
        {
          category: 'Aptitude & Problem Solving',
          status: 'Screening Ready (74% Score)',
          summary: 'Quantitative arithmetic (Time & Work, Percentages, Probability) and Deductive syllogisms.',
          verified_level: 'Proficient',
          recommended_action: 'Maintain speed drills in Data Interpretation tables under 15-minute timers.'
        },
        {
          category: 'Communication & HR Preparation',
          status: 'Recommended Action',
          summary: 'Leadership principles, STAR method storytelling, conflict resolution, and career motivation.',
          verified_level: 'Needs Practice',
          recommended_action: 'Record written answers in the AI Mock Interview Studio for behavioral feedback.'
        },
        {
          category: 'Projects & Portfolio Evidence',
          status: 'Verified (2 Production Deployments)',
          summary: 'Demonstrated real-time systems with Docker, FastAPI, and PostgreSQL with measured scale.',
          verified_level: 'Strong',
          recommended_action: 'Add system architecture diagrams and latency benchmarks to GitHub READMEs.'
        },
        {
          category: 'Resume Tailoring & ATS',
          status: 'Primary ATS Score: 91.5%',
          summary: 'Keyword optimization for target role, action verb density, and measurable metric proofs.',
          verified_level: 'High',
          recommended_action: `Compare primary resume against ${company}'s actual job descriptions in Resume Builder.`
        },
        {
          category: 'Interview Practice',
          status: 'Active Studio',
          summary: 'Technical and behavioral mock interview simulations with structured rubrics.',
          verified_level: 'Good',
          recommended_action: 'Complete at least 1 mock interview session weekly prior to recruitment drives.'
        }
      ]
    }
  }
}
