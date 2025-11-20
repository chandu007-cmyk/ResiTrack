
import React, { useState, useRef } from 'react';
import { Patient, DailyNote, Todo, Urgency, Ward, Role, Treatment, Investigation, VitalSign, CodeStatus, Acuity } from '../types';
import { ArrowLeft, Plus, Save, FileText, Activity, Brain, AlertTriangle, CheckCircle, Circle, MapPin, UserCheck, Pill, Microscope, Trash2, X, Pencil, Mic, StopCircle, Loader2, Moon, Siren, ShieldAlert } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateClinicalAnalysis, generateDischargeSummary, generateSoapFromAudio, generateHandoverGuidance } from '../services/geminiService';
import { VitalTrends, LabTrends } from './Trends';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onUpdatePatient: (p: Patient) => void;
}

const WARDS: Ward[] = ['MALE MEDICAL WARD', 'FEMALE MEDICAL WARD', 'RED ZONE', 'EICU', 'MICU'];

const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, onUpdatePatient }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'treatment' | 'investigations' | 'daily' | 'analysis' | 'signout' | 'discharge'>('overview');
  
  // Todo State
  const [newTodo, setNewTodo] = useState('');
  const [newTodoAssignee, setNewTodoAssignee] = useState('');
  const [newTodoRole, setNewTodoRole] = useState<Role>('Intern');
  
  // Treatment State
  const [newTx, setNewTx] = useState<Partial<Treatment>>({});
  
  // Investigation State
  const [newInv, setNewInv] = useState<Partial<Investigation>>({ status: 'Ordered' });

  // Vitals Modal State
  const [showVitalModal, setShowVitalModal] = useState(false);
  const [vitalForm, setVitalForm] = useState({
    bp: '',
    hr: '',
    rr: '',
    temp: '',
    o2: ''
  });

  // Edit Profile Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<Patient>>({});

  // Daily Note State
  const [loadingAI, setLoadingAI] = useState(false);
  const [noteSubjective, setNoteSubjective] = useState('');
  const [noteObjective, setNoteObjective] = useState('');
  const [noteAssessment, setNoteAssessment] = useState('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdatePatient({ ...patient, ward: e.target.value as Ward });
  };

  // Helper to add todo
  const handleAddTodo = () => {
    if (!newTodo.trim()) return;
    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo,
      completed: false,
      urgency: Urgency.MEDIUM, // Default
      assignedTo: newTodoAssignee || 'Unassigned',
      assigneeRole: newTodoRole
    };
    onUpdatePatient({
      ...patient,
      todos: [...patient.todos, todo]
    });
    setNewTodo('');
    setNewTodoAssignee('');
  };

  const toggleTodo = (id: string) => {
    const updatedTodos = patient.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    onUpdatePatient({ ...patient, todos: updatedTodos });
  };

  const handleAddDailyNote = () => {
    if(!noteSubjective.trim() && !noteObjective.trim()) return;
    const note: DailyNote = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        subjective: noteSubjective,
        objective: noteObjective,
        assessmentPlan: noteAssessment
    };
    onUpdatePatient({
        ...patient,
        dailyNotes: [note, ...patient.dailyNotes]
    });
    setNoteSubjective('');
    setNoteObjective('');
    setNoteAssessment('');
  };

  const handleAddTreatment = () => {
    if (!newTx.name) return;
    const treatment: Treatment = {
      id: Date.now().toString(),
      name: newTx.name,
      dose: newTx.dose || '',
      route: newTx.route || 'PO',
      frequency: newTx.frequency || 'QD',
      startDate: new Date().toISOString().split('T')[0],
      active: true
    };
    onUpdatePatient({ ...patient, treatments: [...patient.treatments, treatment] });
    setNewTx({});
  };

  const toggleTreatment = (id: string) => {
    const updated = patient.treatments.map(t => t.id === id ? { ...t, active: !t.active } : t);
    onUpdatePatient({ ...patient, treatments: updated });
  };

  const handleAddInvestigation = () => {
    if (!newInv.name) return;
    const investigation: Investigation = {
      id: Date.now().toString(),
      name: newInv.name,
      dateOrdered: new Date().toISOString().split('T')[0],
      status: newInv.status || 'Ordered',
      result: newInv.result || ''
    };
    onUpdatePatient({ ...patient, investigations: [...patient.investigations, investigation] });
    setNewInv({ status: 'Ordered' });
  };

  const updateInvestigation = (id: string, field: keyof Investigation, value: string) => {
    const updated = patient.investigations.map(i => i.id === id ? { ...i, [field]: value } : i);
    onUpdatePatient({ ...patient, investigations: updated });
  };

  const handleSaveVital = () => {
    if (!vitalForm.bp) return;
    const newEntry: VitalSign = {
      date: new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      bp: vitalForm.bp,
      hr: parseInt(vitalForm.hr) || 0,
      rr: parseInt(vitalForm.rr) || 0,
      temp: parseFloat(vitalForm.temp) || 0,
      o2: parseInt(vitalForm.o2) || 0
    };
    onUpdatePatient({
      ...patient,
      vitals: [...patient.vitals, newEntry]
    });
    setShowVitalModal(false);
    setVitalForm({ bp: '', hr: '', rr: '', temp: '', o2: '' });
  };

  const handleEditProfileClick = () => {
    setProfileForm({
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        address: patient.address || '',
        uhid: patient.uhid || '',
        ipNumber: patient.ipNumber || '',
    });
    setShowEditProfile(true);
  };

  const handleSaveProfile = () => {
      onUpdatePatient({
          ...patient,
          ...profileForm
      });
      setShowEditProfile(false);
  };

  const runAnalysis = async () => {
    setLoadingAI(true);
    const analysis = await generateClinicalAnalysis(patient);
    onUpdatePatient({ ...patient, aiCritique: analysis });
    setLoadingAI(false);
  };

  const runDischarge = async () => {
    setLoadingAI(true);
    const summary = await generateDischargeSummary(patient);
    onUpdatePatient({ ...patient, dischargeSummary: summary });
    setLoadingAI(false);
  };
  
  const runHandoverGen = async () => {
    setLoadingAI(true);
    const guidance = await generateHandoverGuidance(patient);
    onUpdatePatient({ ...patient, handoverGuidance: guidance });
    setLoadingAI(false);
  };

  // Audio Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Turn off mic
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessingAudio(true);
    }
  };

  const processAudio = async (blob: Blob) => {
    try {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
            const base64data = reader.result as string;
            // The result comes as "data:audio/webm;base64,..." we need to extract content and mime type
            const base64Content = base64data.split(',')[1];
            const mimeType = base64data.split(',')[0].split(':')[1].split(';')[0];

            const soap = await generateSoapFromAudio(base64Content, mimeType);
            if (soap) {
                setNoteSubjective(prev => (prev ? prev + '\n' : '') + (soap.subjective || ''));
                setNoteObjective(prev => (prev ? prev + '\n' : '') + (soap.objective || ''));
                setNoteAssessment(prev => (prev ? prev + '\n' : '') + (soap.assessmentPlan || ''));
            }
            setIsProcessingAudio(false);
        }
    } catch (e) {
        console.error(e);
        setIsProcessingAudio(false);
        alert("Failed to transcribe audio.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 z-10 gap-4 sm:gap-0">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-slate-800 truncate">{patient.name}</h1>
                <button 
                    onClick={handleEditProfileClick}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-50"
                    title="Edit Demographics"
                >
                    <Pencil className="w-4 h-4" />
                </button>
                
                {/* Ward Shifting Dropdown */}
                <div className="relative group ml-2">
                    <select 
                        value={patient.ward} 
                        onChange={handleWardChange}
                        className="appearance-none bg-blue-50 border border-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded cursor-pointer hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-6"
                    >
                        {WARDS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                    <MapPin className="w-3 h-3 text-blue-800 absolute right-2 top-1.5 pointer-events-none" />
                </div>
                
                {patient.acuity === 'UNSTABLE' && <span className="flex items-center text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded animate-pulse"><Siren className="w-3 h-3 mr-1"/> UNSTABLE</span>}
            </div>
            <div className="flex gap-2 text-sm text-slate-500 items-center flex-wrap mt-1">
               <span>{patient.age}yo {patient.gender}</span>
               {patient.uhid && (
                   <>
                    <span className="hidden sm:inline">•</span>
                    <span>UHID: {patient.uhid}</span>
                   </>
               )}
                {patient.ipNumber && (
                   <>
                    <span className="hidden sm:inline">•</span>
                    <span>IP: {patient.ipNumber}</span>
                   </>
               )}
               <span className="hidden sm:inline">•</span>
               <span>Adm: {patient.admissionDate}</span>
            </div>
            {patient.address && (
                <div className="text-xs text-slate-400 flex items-center mt-0.5">
                    <MapPin className="w-3 h-3 mr-1" /> {patient.address}
                </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'treatment', label: 'Treatment', icon: Pill },
            { id: 'investigations', label: 'Labs/Img', icon: Microscope },
            { id: 'daily', label: 'Daily Notes', icon: FileText },
            { id: 'analysis', label: 'AI Analysis', icon: Brain },
            { id: 'signout', label: 'Sign-out', icon: Moon },
            { id: 'discharge', label: 'Discharge', icon: Save }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Col: Clinical Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Chief Complaint</h3>
                <textarea 
                   className="w-full p-2 border border-slate-100 rounded-lg text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-transparent hover:bg-slate-50 transition-colors"
                   rows={2}
                   value={patient.chiefComplaint}
                   onChange={(e) => onUpdatePatient({...patient, chiefComplaint: e.target.value})}
                   placeholder="e.g. Chest pain, Shortness of breath"
                />
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">History of Present Illness</h3>
                <textarea 
                   className="w-full p-2 border border-slate-100 rounded-lg text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-transparent hover:bg-slate-50 transition-colors"
                   rows={4}
                   value={patient.historyOfPresentIllness}
                   onChange={(e) => onUpdatePatient({...patient, historyOfPresentIllness: e.target.value})}
                   placeholder="Detailed history..."
                />
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Past Medical History</h3>
                <textarea 
                   className="w-full p-2 border border-slate-100 rounded-lg text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-transparent hover:bg-slate-50 transition-colors"
                   rows={2}
                   value={patient.pastMedicalHistory}
                   onChange={(e) => onUpdatePatient({...patient, pastMedicalHistory: e.target.value})}
                   placeholder="Known comorbidities..."
                />
              </div>

              {/* New Systemic Exam at Admission Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center">
                   Systemic Examination (Admission)
                </h3>
                <textarea 
                   className="w-full p-2 border border-slate-100 rounded-lg text-slate-700 leading-relaxed resize-none focus:ring-2 focus:ring-blue-100 outline-none bg-transparent hover:bg-slate-50 transition-colors"
                   rows={4}
                   placeholder="CVS, Resp, Abd, CNS findings at admission..."
                   value={patient.systemicExamination}
                   onChange={(e) => onUpdatePatient({...patient, systemicExamination: e.target.value})}
                />
              </div>
            </div>

            {/* Right Col: Todos & Vitals Snapshot */}
            <div className="space-y-6">
               
               {/* VITALS & TRENDS CARD */}
               <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 relative">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider flex items-center">
                        <Activity className="w-4 h-4 mr-2" /> Vitals Trends
                    </h3>
                    <button 
                      onClick={() => setShowVitalModal(true)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors flex items-center font-medium"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add
                    </button>
                  </div>
                  
                  {patient.vitals.length > 0 ? (
                    <VitalTrends vitals={patient.vitals} />
                  ) : <p className="text-sm text-blue-400 italic">No vitals recorded yet.</p>}
               </div>

               {/* Enhanced Todo List */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                    Team Tasks
                  </h3>
                  <div className="flex flex-col gap-2 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input 
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                      placeholder="Task description..."
                      value={newTodo}
                      onChange={(e) => setNewTodo(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <input 
                            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-md outline-none focus:border-blue-500"
                            placeholder="Assignee Name"
                            value={newTodoAssignee}
                            onChange={(e) => setNewTodoAssignee(e.target.value)}
                        />
                        <select 
                            className="px-2 py-2 text-sm border border-slate-200 rounded-md outline-none bg-white text-slate-600"
                            value={newTodoRole}
                            onChange={(e) => setNewTodoRole(e.target.value as Role)}
                        >
                            <option value="Intern">Intern</option>
                            <option value="Resident">Resident</option>
                        </select>
                    </div>
                    <button onClick={handleAddTodo} className="w-full bg-slate-800 text-white p-2 rounded-md hover:bg-slate-700 text-sm font-medium flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" /> Assign Task
                    </button>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {patient.todos.map(todo => (
                      <div key={todo.id} className={`flex flex-col p-3 rounded-lg border transition-colors ${todo.completed ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-indigo-50 border-indigo-100 hover:border-indigo-200'}`}>
                        <div className="flex items-start gap-3">
                            <button onClick={() => toggleTodo(todo.id)} className="mt-0.5 flex-shrink-0">
                            {todo.completed ? <CheckCircle className="w-5 h-5 text-slate-400" /> : <Circle className="w-5 h-5 text-indigo-600" />}
                            </button>
                            <div className="flex-1">
                                <span className={`text-sm block mb-1 font-medium ${todo.completed ? 'text-slate-400 line-through' : 'text-black'}`}>
                                    {todo.text}
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-[10px] uppercase font-bold text-indigo-500 bg-white border border-indigo-100 px-2 py-0.5 rounded">
                                        <UserCheck className="w-3 h-3 mr-1" />
                                        {todo.assignedTo} ({todo.assigneeRole})
                                    </div>
                                    {todo.urgency === Urgency.CRITICAL && !todo.completed && (
                                        <AlertTriangle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* TREATMENT TAB */}
        {activeTab === 'treatment' && (
           <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-slate-800">Treatment Chart</h2>
              </div>
              
              {/* Add New Treatment */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                   <div className="sm:col-span-2">
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Drug Name</label>
                     <input 
                        className="w-full p-2 border border-slate-300 rounded text-sm" 
                        placeholder="e.g. Piperacillin-Tazobactam"
                        value={newTx.name || ''}
                        onChange={e => setNewTx({...newTx, name: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Dose</label>
                     <input 
                        className="w-full p-2 border border-slate-300 rounded text-sm" 
                        placeholder="4.5g"
                        value={newTx.dose || ''}
                        onChange={e => setNewTx({...newTx, dose: e.target.value})}
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Route/Freq</label>
                     <div className="flex gap-1">
                        <input 
                           className="w-1/2 p-2 border border-slate-300 rounded text-sm" 
                           placeholder="IV"
                           value={newTx.route || ''}
                           onChange={e => setNewTx({...newTx, route: e.target.value})}
                        />
                         <input 
                           className="w-1/2 p-2 border border-slate-300 rounded text-sm" 
                           placeholder="Q6H"
                           value={newTx.frequency || ''}
                           onChange={e => setNewTx({...newTx, frequency: e.target.value})}
                        />
                     </div>
                   </div>
                   <button onClick={handleAddTreatment} className="bg-blue-600 text-white p-2 rounded text-sm font-bold h-10 hover:bg-blue-700">
                      Add
                   </button>
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                       <tr>
                         <th className="p-4">Active</th>
                         <th className="p-4">Drug</th>
                         <th className="p-4">Dose</th>
                         <th className="p-4">Route/Freq</th>
                         <th className="p-4">Start Date</th>
                         <th className="p-4 text-right">Action</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                       {patient.treatments.map(tx => (
                          <tr key={tx.id} className={tx.active ? '' : 'bg-slate-50 opacity-60'}>
                             <td className="p-4">
                                <button onClick={() => toggleTreatment(tx.id)}>
                                   {tx.active ? <CheckCircle className="w-5 h-5 text-green-500"/> : <Circle className="w-5 h-5 text-slate-300"/>}
                                </button>
                             </td>
                             <td className={`p-4 font-medium ${tx.active ? 'text-slate-800' : 'text-slate-500 line-through'}`}>{tx.name}</td>
                             <td className="p-4 text-slate-600">{tx.dose}</td>
                             <td className="p-4 text-slate-600"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold mr-1">{tx.route}</span> {tx.frequency}</td>
                             <td className="p-4 text-slate-500">{tx.startDate}</td>
                             <td className="p-4 text-right">
                                <button className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                             </td>
                          </tr>
                       ))}
                       {patient.treatments.length === 0 && (
                          <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No medications added.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* INVESTIGATIONS TAB */}
        {activeTab === 'investigations' && (
           <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-2xl font-bold text-slate-800">Investigations Chart</h2>
              </div>
              
              {/* Labs Trend Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                 <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">Values Trending</h3>
                 <LabTrends labs={patient.labs} />
              </div>

              {/* Add New Inv */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex gap-3">
                 <input 
                    className="flex-1 p-2 border border-slate-300 rounded text-sm" 
                    placeholder="Test Name (e.g. CXR, CBC, CMP)"
                    value={newInv.name || ''}
                    onChange={e => setNewInv({...newInv, name: e.target.value})}
                 />
                  <select 
                    className="p-2 border border-slate-300 rounded text-sm bg-white"
                    value={newInv.status}
                    onChange={e => setNewInv({...newInv, status: e.target.value as any})}
                  >
                     <option value="Ordered">Ordered</option>
                     <option value="Pending">Pending</option>
                     <option value="Completed">Completed</option>
                  </select>
                 <button onClick={handleAddInvestigation} className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700">
                    Order
                 </button>
              </div>

              {/* List */}
              <div className="space-y-3">
                 {patient.investigations.map(inv => (
                    <div key={inv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 sm:items-center">
                       <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-semibold text-slate-800">{inv.name}</h3>
                             <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                                inv.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                inv.status === 'Pending' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                             }`}>
                                {inv.status}
                             </span>
                          </div>
                          <div className="text-xs text-slate-400">Ordered: {inv.dateOrdered}</div>
                       </div>

                       <div className="flex-1 w-full">
                          <input 
                             className="w-full text-sm p-2 border border-slate-100 rounded bg-slate-50 focus:bg-white focus:border-blue-300 outline-none transition-all"
                             placeholder={inv.status === 'Completed' ? "Result..." : "Enter result to complete..."}
                             value={inv.result}
                             onChange={e => updateInvestigation(inv.id, 'result', e.target.value)}
                             onBlur={() => {
                                if(inv.result && inv.status !== 'Completed') updateInvestigation(inv.id, 'status', 'Completed');
                             }}
                          />
                       </div>
                       
                       <div>
                           <select 
                              className="text-xs p-1 border border-slate-200 rounded bg-white text-slate-500"
                              value={inv.status}
                              onChange={e => updateInvestigation(inv.id, 'status', e.target.value)}
                           >
                              <option value="Ordered">Ordered</option>
                              <option value="Pending">Pending</option>
                              <option value="Completed">Completed</option>
                           </select>
                       </div>
                    </div>
                 ))}
                 {patient.investigations.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic">No investigations ordered.</div>
                 )}
              </div>
           </div>
        )}

        {/* DAILY TAB */}
        {activeTab === 'daily' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6 sticky top-20">
                <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    <span>New Daily Round Note</span>
                    {!isRecording && !isProcessingAudio && (
                        <button 
                            onClick={startRecording}
                            className="text-xs flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full hover:bg-red-100 transition-colors font-medium"
                        >
                            <Mic className="w-3 h-3" /> Dictate Note
                        </button>
                    )}
                    {isRecording && (
                        <button 
                            onClick={stopRecording}
                            className="text-xs flex items-center gap-1 bg-red-600 text-white border border-red-600 px-3 py-1.5 rounded-full hover:bg-red-700 transition-colors animate-pulse font-medium"
                        >
                            <StopCircle className="w-3 h-3" /> Stop & Process
                        </button>
                    )}
                    {isProcessingAudio && (
                        <span className="text-xs flex items-center gap-1 text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                            <Loader2 className="w-3 h-3 animate-spin" /> Transcribing...
                        </span>
                    )}
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subjective</label>
                        <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        rows={2}
                        placeholder="Patient complaints, overnight events..."
                        value={noteSubjective}
                        onChange={e => setNoteSubjective(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Objective / Systemic Exam</label>
                        <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-slate-50"
                        rows={3}
                        placeholder="Vitals review, CVS/Resp/Abd findings..."
                        value={noteObjective}
                        onChange={e => setNoteObjective(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Assessment & Plan</label>
                        <textarea 
                        className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        rows={3}
                        placeholder="Impression, med changes, labs to order..."
                        value={noteAssessment}
                        onChange={e => setNoteAssessment(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button 
                            onClick={handleAddDailyNote}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                            Save Note
                        </button>
                    </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pb-20">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Note History</h3>
              {patient.dailyNotes.map(note => (
                <div key={note.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                     <span className="text-xs font-bold text-blue-600 uppercase">{note.date}</span>
                  </div>
                  <div className="p-4 space-y-3">
                     {note.subjective && (
                         <div>
                             <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Subjective</span>
                             <p className="text-sm text-slate-700">{note.subjective}</p>
                         </div>
                     )}
                     {note.objective && (
                         <div className="bg-slate-50 p-2 rounded border border-slate-100">
                             <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Objective / Exam</span>
                             <p className="text-sm text-slate-800 font-medium">{note.objective}</p>
                         </div>
                     )}
                     {note.assessmentPlan && (
                         <div>
                             <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Assessment & Plan</span>
                             <p className="text-sm text-slate-700">{note.assessmentPlan}</p>
                         </div>
                     )}
                  </div>
                </div>
              ))}
              {patient.dailyNotes.length === 0 && (
                  <p className="text-slate-400 italic text-center py-10">No daily notes recorded yet.</p>
              )}
            </div>
          </div>
        )}

        {/* AI ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-8 rounded-2xl text-white shadow-lg mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Brain className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Critical Case Analysis</h2>
                  <p className="text-white/80">AI-powered differential diagnosis & prognostic suggestions.</p>
                </div>
              </div>
              <button 
                onClick={runAnalysis}
                disabled={loadingAI}
                className="bg-white text-violet-600 px-6 py-3 rounded-lg font-bold hover:bg-opacity-90 transition-all shadow-lg flex items-center"
              >
                {loadingAI ? 'Thinking...' : 'Run New Analysis'}
              </button>
            </div>

            {patient.aiCritique ? (
              <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm prose prose-slate max-w-none">
                <ReactMarkdown>{patient.aiCritique}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No analysis generated yet. Click the button above to start.</p>
              </div>
            )}
          </div>
        )}
        
        {/* SIGNOUT / HANDOVER TAB */}
        {activeTab === 'signout' && (
           <div className="max-w-3xl mx-auto">
               <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <Moon className="w-6 h-6 mr-2 text-indigo-600" /> Night Float / Handover
                    </h2>
               </div>

               {/* Status Card */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Acuity Level</label>
                           <div className="flex gap-2">
                               {(['STABLE', 'WATCHER', 'UNSTABLE'] as Acuity[]).map(lvl => (
                                   <button 
                                        key={lvl}
                                        onClick={() => onUpdatePatient({...patient, acuity: lvl})}
                                        className={`flex-1 py-2 text-xs font-bold rounded border transition-all ${
                                            patient.acuity === lvl 
                                            ? (lvl === 'UNSTABLE' ? 'bg-red-100 border-red-200 text-red-700' : lvl === 'WATCHER' ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-green-100 border-green-200 text-green-700')
                                            : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                                        }`}
                                   >
                                       {lvl}
                                   </button>
                               ))}
                           </div>
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Code Status</label>
                           <select 
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={patient.codeStatus || 'FULL CODE'}
                                onChange={e => onUpdatePatient({...patient, codeStatus: e.target.value as CodeStatus})}
                           >
                               <option value="FULL CODE">FULL CODE</option>
                               <option value="DNR/DNI">DNR / DNI</option>
                               <option value="LIMITED">LIMITED THERAPY</option>
                           </select>
                       </div>
                   </div>
               </div>

               {/* Contingency Plan */}
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold flex items-center"><ShieldAlert className="w-4 h-4 mr-2" /> Anticipatory Guidance (If/Then)</h3>
                            <p className="text-xs text-slate-400 mt-1">Contingencies for the night team</p>
                        </div>
                        <button 
                            onClick={runHandoverGen}
                            disabled={loadingAI}
                            className="bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded shadow transition-colors"
                        >
                            {loadingAI ? 'Generating...' : 'Generate with AI'}
                        </button>
                    </div>
                    <div className="p-0">
                        <textarea 
                            className="w-full h-64 p-6 outline-none resize-none text-slate-700 leading-relaxed"
                            placeholder="e.g. If Temp > 38.5, pan culture and call resident..."
                            value={patient.handoverGuidance || ''}
                            onChange={e => onUpdatePatient({...patient, handoverGuidance: e.target.value})}
                        />
                    </div>
               </div>

               {/* Active To-Dos for Night Team */}
               <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Pending Critical Tasks</h3>
                    <div className="space-y-2">
                        {patient.todos.filter(t => !t.completed).length === 0 ? (
                            <p className="text-slate-400 text-sm italic">No pending tasks.</p>
                        ) : (
                            patient.todos.filter(t => !t.completed).map(todo => (
                                <div key={todo.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${todo.urgency === 'High' || todo.urgency === 'Critical' ? 'text-red-500' : 'text-slate-400'}`} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-800">{todo.text}</p>
                                        <span className="text-xs text-slate-500">{todo.assignedTo} ({todo.assigneeRole})</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
               </div>
           </div>
        )}

        {/* DISCHARGE TAB */}
        {activeTab === 'discharge' && (
          <div className="max-w-4xl mx-auto h-full flex flex-col">
             <div className="flex justify-between items-center mb-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-800">Discharge Summary</h2>
                   <p className="text-slate-500 text-sm">Draft key sections below, then use AI to compile.</p>
                </div>
                <button 
                  onClick={runDischarge}
                  disabled={loadingAI}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow flex items-center text-sm font-medium"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  {loadingAI ? 'Drafting...' : 'Auto-Draft with AI'}
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Course In Hospital Input */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <label className="block text-sm font-bold text-slate-700 mb-2">Course in Hospital</label>
                   <textarea 
                      className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Briefly summarize the hospital stay events..."
                      value={patient.hospitalCourse || ''}
                      onChange={e => onUpdatePatient({...patient, hospitalCourse: e.target.value})}
                   />
                </div>

                {/* Advice on Discharge Input */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                   <label className="block text-sm font-bold text-slate-700 mb-2">Advice on Discharge</label>
                   <textarea 
                      className="w-full h-32 p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                      placeholder="Follow up in 2 weeks, low salt diet, etc..."
                      value={patient.dischargeAdvice || ''}
                      onChange={e => onUpdatePatient({...patient, dischargeAdvice: e.target.value})}
                   />
                </div>
             </div>

             <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-1">
               <textarea 
                 className="w-full h-[400px] p-6 outline-none text-slate-800 leading-relaxed resize-none rounded-xl font-mono text-sm"
                 value={patient.dischargeSummary || ''}
                 onChange={(e) => onUpdatePatient({...patient, dischargeSummary: e.target.value})}
                 placeholder="Final Summary will appear here..."
               />
             </div>
          </div>
        )}

      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in duration-200">
                <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        Edit Patient Demographics
                    </h3>
                    <button onClick={() => setShowEditProfile(false)} className="text-slate-300 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profileForm.name || ''}
                            onChange={e => setProfileForm({...profileForm, name: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Age</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={profileForm.age || ''}
                                onChange={e => setProfileForm({...profileForm, age: parseInt(e.target.value) || 0})}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sex</label>
                            <select 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                value={profileForm.gender || 'Male'}
                                onChange={e => setProfileForm({...profileForm, gender: e.target.value as any})}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={profileForm.address || ''}
                            onChange={e => setProfileForm({...profileForm, address: e.target.value})}
                        />
                    </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UHID</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={profileForm.uhid || ''}
                                onChange={e => setProfileForm({...profileForm, uhid: e.target.value})}
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">IP Number</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={profileForm.ipNumber || ''}
                                onChange={e => setProfileForm({...profileForm, ipNumber: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSaveProfile}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-colors"
                        >
                            Save Details
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}

      {/* Vitals Quick Add Modal */}
      {showVitalModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg flex items-center">
                <Activity className="w-5 h-5 mr-2" /> Add Vitals
              </h3>
              <button onClick={() => setShowVitalModal(false)} className="text-blue-200 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Blood Pressure (mmHg)</label>
                <input 
                  type="text" 
                  placeholder="120/80"
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono"
                  value={vitalForm.bp}
                  onChange={e => setVitalForm({...vitalForm, bp: e.target.value})}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Heart Rate (bpm)</label>
                  <input 
                    type="number" 
                    placeholder="72"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono"
                    value={vitalForm.hr}
                    onChange={e => setVitalForm({...vitalForm, hr: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Resp. Rate (bpm)</label>
                  <input 
                    type="number" 
                    placeholder="16"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono"
                    value={vitalForm.rr}
                    onChange={e => setVitalForm({...vitalForm, rr: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temp (°C)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    placeholder="37.0"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono"
                    value={vitalForm.temp}
                    onChange={e => setVitalForm({...vitalForm, temp: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">O2 Sat (%)</label>
                  <input 
                    type="number" 
                    placeholder="98"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg font-mono"
                    value={vitalForm.o2}
                    onChange={e => setVitalForm({...vitalForm, o2: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleSaveVital}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg transition-colors"
                >
                  Save Vitals
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
