
export enum Urgency {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export type Ward = 'MALE MEDICAL WARD' | 'FEMALE MEDICAL WARD' | 'RED ZONE' | 'EICU' | 'MICU';

export type Role = 'Resident' | 'Intern';

export type CodeStatus = 'FULL CODE' | 'DNR' | 'DNI' | 'DNR/DNI' | 'LIMITED';

export type Acuity = 'STABLE' | 'WATCHER' | 'UNSTABLE';

export interface VitalSign {
  date: string;
  bp: string;
  hr: number;
  rr: number;
  temp: number;
  o2: number;
}

export interface LabResult {
  date: string;
  values: string; // Free text for flexibility or JSON string
}

export interface DailyNote {
  id: string;
  date: string;
  subjective: string;
  objective: string; // Systemic Exam Findings during rounds
  assessmentPlan: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  urgency: Urgency;
  assignedTo?: string;
  assigneeRole?: Role;
}

export interface RoundsQuestion {
  id: string;
  question: string;
  answer: string;
  faculty: string;
  scenario: string; // Brief description of clinical scenario
  diseaseTag: string;
  patientId?: string; // Link to a patient if applicable
  date: string;
}

export interface Treatment {
  id: string;
  name: string;
  dose: string;
  route: string;
  frequency: string;
  startDate: string;
  active: boolean;
}

export interface Investigation {
  id: string;
  name: string;
  dateOrdered: string;
  status: 'Ordered' | 'Pending' | 'Completed';
  result: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  mrn: string; // Medical Record Number - Keeping for backward compatibility
  uhid: string; // Unique Health ID
  ipNumber: string; // Inpatient Number
  address: string;
  ward: Ward;
  admissionDate: string;
  
  // Clinical History (Admission)
  chiefComplaint: string;
  historyOfPresentIllness: string;
  pastMedicalHistory: string;
  systemicExamination: string; // Admission Systemic Exam

  vitals: VitalSign[];
  labs: LabResult[];
  dailyNotes: DailyNote[];
  todos: Todo[];
  
  // New Charts
  treatments: Treatment[];
  investigations: Investigation[];

  // Discharge Specifics
  hospitalCourse: string;
  dischargeAdvice: string;
  
  // Handover / Sign-out
  codeStatus?: CodeStatus;
  acuity?: Acuity;
  handoverGuidance?: string;

  // AI Generated Fields
  aiDifferentialDiagnosis?: string;
  aiPrognosis?: string;
  aiCritique?: string;
  dischargeSummary?: string;
}

export type ViewState = 'DASHBOARD' | 'PATIENT_DETAIL' | 'ROUNDS_TRACKER';
