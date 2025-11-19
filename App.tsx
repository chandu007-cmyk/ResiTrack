
import React, { useState } from 'react';
import PatientList from './components/PatientList';
import PatientDetail from './components/PatientDetail';
import RoundsTracker from './components/RoundsTracker';
import { Patient, RoundsQuestion, ViewState, Ward } from './types';
import { Stethoscope, Layout, ClipboardList, Settings } from 'lucide-react';

// Initial Mock Data
const INITIAL_PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'John Doe',
    age: 54,
    gender: 'Male',
    mrn: '884921',
    uhid: 'UHID-001',
    ipNumber: 'IP-1001',
    address: '123 Main St, Springfield',
    ward: 'MALE MEDICAL WARD',
    admissionDate: '2023-10-24',
    chiefComplaint: 'Shortness of breath',
    historyOfPresentIllness: '54yo M with hx of CHF presenting with 3 days of worsening dyspnea on exertion and orthopnea.',
    pastMedicalHistory: 'CHF (EF 35%), HTN, HLD, T2DM',
    systemicExamination: 'CVS: S1S2+, S3 gallop present. JVP elevated. Resp: Bilateral bibasilar crackles. Abd: Soft, non-tender. CNS: Intact.',
    vitals: [{ date: '2023-10-26', bp: '145/90', hr: 88, rr: 22, temp: 37.1, o2: 94 }],
    labs: [{ date: '2023-10-26', values: 'Na 135, K 4.2, Cr 1.4, BNP 800' }],
    dailyNotes: [
      { 
        id: 'n1', 
        date: '2023-10-25', 
        subjective: 'Feeling slightly better, less dyspnea.', 
        objective: 'Crackles persisting at bases but improved. JVP 3cm > sternal angle.',
        assessmentPlan: 'Acute CHF exacerbation resolving. Continue Lasix. Monitor lytes.'
      }
    ],
    todos: [
      { id: 't1', text: 'Check morning K+', completed: false, urgency: 'High', assignedTo: 'Dr. Emily', assigneeRole: 'Intern' } as any,
      { id: 't2', text: 'Call Cardio for Echo', completed: true, urgency: 'Medium', assignedTo: 'Dr. Raj', assigneeRole: 'Resident' } as any
    ],
    treatments: [
      { id: 'rx1', name: 'Furosemide', dose: '40mg', route: 'IV', frequency: 'BID', startDate: '2023-10-24', active: true },
      { id: 'rx2', name: 'Lisinopril', dose: '10mg', route: 'PO', frequency: 'QD', startDate: '2023-10-24', active: true }
    ],
    investigations: [
      { id: 'inv1', name: 'Echocardiogram', dateOrdered: '2023-10-25', status: 'Pending', result: '' },
      { id: 'inv2', name: 'CXR', dateOrdered: '2023-10-24', status: 'Completed', result: 'Pulmonary Edema' }
    ],
    hospitalCourse: '',
    dischargeAdvice: ''
  },
  {
    id: '2',
    name: 'Sarah Smith',
    age: 29,
    gender: 'Female',
    mrn: '992102',
    uhid: 'UHID-002',
    ipNumber: 'IP-1002',
    address: '456 Elm St, Springfield',
    ward: 'FEMALE MEDICAL WARD',
    admissionDate: '2023-10-25',
    chiefComplaint: 'Abdominal Pain',
    historyOfPresentIllness: '29yo F presenting with RLQ pain, nausea, vomiting x 12hrs.',
    pastMedicalHistory: 'None',
    systemicExamination: 'Abd: Tenderness at McBurney\'s point. Rebound tenderness positive. Guarding present.',
    vitals: [{ date: '2023-10-26', bp: '110/70', hr: 95, rr: 18, temp: 38.2, o2: 99 }],
    labs: [],
    dailyNotes: [],
    todos: [],
    treatments: [],
    investigations: [],
    hospitalCourse: '',
    dischargeAdvice: ''
  },
  {
    id: '3',
    name: 'Robert Johnson',
    age: 68,
    gender: 'Male',
    mrn: '102938',
    uhid: 'UHID-003',
    ipNumber: 'IP-1003',
    address: '789 Oak St, Shelbyville',
    ward: 'EICU',
    admissionDate: '2023-10-26',
    chiefComplaint: 'Altered Mental Status',
    historyOfPresentIllness: '68yo M found down by family. Confusion and fever.',
    pastMedicalHistory: 'Dementia, BPH',
    systemicExamination: 'CNS: Disoriented to time/place. GCS 13. Neck stiffness negative. Resp: Clear.',
    vitals: [{ date: '2023-10-26', bp: '90/50', hr: 110, rr: 24, temp: 39.1, o2: 90 }],
    labs: [],
    dailyNotes: [],
    todos: [],
    treatments: [],
    investigations: [],
    hospitalCourse: '',
    dischargeAdvice: ''
  }
];

const INITIAL_QUESTIONS: RoundsQuestion[] = [
    {
        id: 'q1',
        question: 'What are the Duke Criteria for Endocarditis?',
        answer: 'Major: Positive blood culture, Evidence of endocardial involvement. Minor: Predisposition, Fever, Vascular phenomena, Immunologic phenomena.',
        faculty: 'Dr. House',
        diseaseTag: 'Infectious Disease',
        scenario: 'Discussing criteria while examining a patient with fever and new murmur.',
        date: '2023-10-20',
        patientId: '1'
    }
];

const App: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);
  const [questions, setQuestions] = useState<RoundsQuestion[]>(INITIAL_QUESTIONS);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    setView('PATIENT_DETAIL');
  };

  const handleUpdatePatient = (updatedPatient: Patient) => {
    setPatients(patients.map(p => p.id === updatedPatient.id ? updatedPatient : p));
  };

  const handleAddPatient = () => {
    const newPatient: Patient = {
      id: Date.now().toString(),
      name: 'New Patient',
      age: 0,
      gender: 'Other',
      mrn: '',
      uhid: '',
      ipNumber: '',
      address: '',
      ward: 'MALE MEDICAL WARD',
      admissionDate: new Date().toISOString().split('T')[0],
      chiefComplaint: '',
      historyOfPresentIllness: '',
      pastMedicalHistory: '',
      systemicExamination: '',
      vitals: [],
      labs: [],
      dailyNotes: [],
      todos: [],
      treatments: [],
      investigations: [],
      hospitalCourse: '',
      dischargeAdvice: ''
    };
    setPatients([newPatient, ...patients]);
    handleSelectPatient(newPatient.id);
  };

  const handleAddQuestion = (q: RoundsQuestion) => {
    setQuestions([q, ...questions]);
  };

  const handleUpdateQuestion = (updatedQ: RoundsQuestion) => {
    setQuestions(questions.map(q => q.id === updatedQ.id ? updatedQ : q));
  };

  const renderContent = () => {
    switch (view) {
      case 'DASHBOARD':
        return <PatientList patients={patients} onSelectPatient={handleSelectPatient} onAddPatient={handleAddPatient} />;
      case 'PATIENT_DETAIL':
        const patient = patients.find(p => p.id === selectedPatientId);
        if (!patient) return <div>Patient not found</div>;
        return <PatientDetail patient={patient} onBack={() => setView('DASHBOARD')} onUpdatePatient={handleUpdatePatient} />;
      case 'ROUNDS_TRACKER':
        return <RoundsTracker 
          questions={questions} 
          patients={patients} 
          onAddQuestion={handleAddQuestion}
          onUpdateQuestion={handleUpdateQuestion}
        />;
      default:
        return <div>404</div>;
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar Desktop */}
      <aside className="w-20 lg:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col border-r border-slate-800">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
          <Stethoscope className="w-8 h-8 text-blue-400" />
          <span className="ml-3 font-bold text-xl hidden lg:block tracking-tight">ResiTrack</span>
        </div>
        
        <nav className="flex-1 py-6 space-y-2 px-2">
          <button 
            onClick={() => setView('DASHBOARD')}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${view === 'DASHBOARD' && !selectedPatientId ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Layout className="w-6 h-6 lg:mr-3" />
            <span className="hidden lg:inline font-medium">Dashboard</span>
          </button>
          
          <button 
             onClick={() => setView('ROUNDS_TRACKER')}
             className={`w-full flex items-center p-3 rounded-lg transition-colors ${view === 'ROUNDS_TRACKER' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ClipboardList className="w-6 h-6 lg:mr-3" />
            <span className="hidden lg:inline font-medium">Rounds Tracker</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center p-2 text-slate-500 hover:text-white cursor-pointer">
             <Settings className="w-6 h-6 lg:mr-3" />
             <span className="hidden lg:inline text-sm">Settings</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 h-full overflow-hidden bg-slate-50 relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
