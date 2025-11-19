
import React, { useState, useMemo } from 'react';
import { RoundsQuestion, Patient } from '../types';
import { HelpCircle, Search, Tag, User, Brain, Loader2, Filter, Pencil } from 'lucide-react';
import { answerRoundsQuestion } from '../services/geminiService';

interface RoundsTrackerProps {
  questions: RoundsQuestion[];
  patients: Patient[];
  onAddQuestion: (q: RoundsQuestion) => void;
  onUpdateQuestion: (q: RoundsQuestion) => void;
}

const RoundsTracker: React.FC<RoundsTrackerProps> = ({ questions, patients, onAddQuestion, onUpdateQuestion }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [newQ, setNewQ] = useState<Partial<RoundsQuestion>>({
    date: new Date().toISOString().split('T')[0]
  });

  // Filter State
  const [filterText, setFilterText] = useState('');
  const [filterFaculty, setFilterFaculty] = useState('');
  const [filterPatient, setFilterPatient] = useState('');
  
  const [loadingAnswer, setLoadingAnswer] = useState<string | null>(null);

  const handleSave = () => {
    if (!newQ.question || !newQ.faculty) return;

    const questionData: RoundsQuestion = {
      id: editingId || Date.now().toString(),
      question: newQ.question,
      answer: newQ.answer || '',
      faculty: newQ.faculty,
      diseaseTag: newQ.diseaseTag || 'General',
      scenario: newQ.scenario || '',
      patientId: newQ.patientId,
      date: newQ.date || new Date().toISOString().split('T')[0]
    };

    if (editingId) {
      onUpdateQuestion(questionData);
    } else {
      onAddQuestion(questionData);
    }
    
    resetForm();
    setActiveTab('list');
  };

  const resetForm = () => {
    setNewQ({ date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
  };

  const handleEditClick = (q: RoundsQuestion) => {
    setNewQ({ ...q });
    setEditingId(q.id);
    setActiveTab('add');
  };

  const startAdd = () => {
    resetForm();
    setActiveTab('add');
  };

  const handleGetAIAnswer = async (qId: string, question: string, context: string) => {
    setLoadingAnswer(qId);
    const answer = await answerRoundsQuestion(question, context);
    alert(`AI Suggested Answer:\n\n${answer}`);
    setLoadingAnswer(null);
  };

  // Filtering Logic
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesText = q.question.toLowerCase().includes(filterText.toLowerCase()) || 
                          q.diseaseTag.toLowerCase().includes(filterText.toLowerCase()) ||
                          (q.scenario && q.scenario.toLowerCase().includes(filterText.toLowerCase()));
      
      const matchesFaculty = filterFaculty ? q.faculty.toLowerCase().includes(filterFaculty.toLowerCase()) : true;
      
      const matchesPatient = filterPatient ? q.patientId === filterPatient : true;

      return matchesText && matchesFaculty && matchesPatient;
    });
  }, [questions, filterText, filterFaculty, filterPatient]);

  const uniqueFaculties = Array.from(new Set(questions.map(q => q.faculty)));

  return (
    <div className="p-6 max-w-5xl mx-auto h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rounds Question Tracker</h1>
          <p className="text-slate-500 text-sm">Log, track, and learn from "pimping" questions.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'list' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border'}`}
          >
            Log
          </button>
          <button 
            onClick={startAdd}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'add' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border'}`}
          >
            {editingId ? 'Edit Question' : 'Add Question'}
          </button>
        </div>
      </div>

      {activeTab === 'add' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto w-full animate-in fade-in zoom-in duration-200 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Question' : 'New Question from Rounds'}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Question</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={3}
                value={newQ.question || ''}
                onChange={e => setNewQ({...newQ, question: e.target.value})}
                placeholder="e.g., What is the triad of Plummer-Vinson syndrome?"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clinical Scenario / Description</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                value={newQ.scenario || ''}
                onChange={e => setNewQ({...newQ, scenario: e.target.value})}
                placeholder="Briefly describe the context (e.g., 40M with dysphagia...)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Faculty / Attending</label>
                <input 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newQ.faculty || ''}
                  onChange={e => setNewQ({...newQ, faculty: e.target.value})}
                  placeholder="Dr. House"
                />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Disease / Topic Tag</label>
                 <input 
                  className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newQ.diseaseTag || ''}
                  onChange={e => setNewQ({...newQ, diseaseTag: e.target.value})}
                  placeholder="Anemia"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link to Patient (Optional)</label>
              <select 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={newQ.patientId || ''}
                onChange={e => setNewQ({...newQ, patientId: e.target.value})}
              >
                <option value="">-- General / No Patient --</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.ward})</option>
                ))}
              </select>
            </div>

             <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Answer (If known)</label>
              <textarea 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                value={newQ.answer || ''}
                onChange={e => setNewQ({...newQ, answer: e.target.value})}
                placeholder="Iron deficiency anemia, dysphagia, esophageal web"
              />
            </div>

            <div className="flex gap-2">
                <button 
                  onClick={() => { resetForm(); setActiveTab('list'); }}
                  className="w-1/3 bg-white border border-slate-300 text-slate-600 font-semibold py-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg shadow transition-colors"
                >
                  {editingId ? 'Update Question' : 'Save Question'}
                </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <>
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input 
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-blue-500"
                    placeholder="Search question, disease, or scenario..."
                    value={filterText}
                    onChange={e => setFilterText(e.target.value)}
                />
            </div>
            <div className="w-full md:w-auto flex gap-2">
                <select 
                    className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-600 outline-none focus:border-blue-500"
                    value={filterFaculty}
                    onChange={e => setFilterFaculty(e.target.value)}
                >
                    <option value="">All Faculty</option>
                    {uniqueFaculties.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <select 
                    className="px-3 py-2 border border-slate-200 rounded-md text-sm bg-white text-slate-600 outline-none focus:border-blue-500 max-w-[150px]"
                    value={filterPatient}
                    onChange={e => setFilterPatient(e.target.value)}
                >
                    <option value="">All Patients</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
          </div>

          {/* List */}
          <div className="grid grid-cols-1 gap-4 overflow-y-auto pb-20">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>No rounds questions match your filters.</p>
              </div>
            ) : (
              filteredQuestions.map(q => {
                const patient = patients.find(p => p.id === q.patientId);
                return (
                  <div key={q.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex justify-between items-start">
                        <div>
                           <span className="px-2 py-1 rounded bg-violet-100 text-violet-700 text-xs font-bold uppercase mr-2">{q.diseaseTag}</span>
                           <span className="text-xs text-slate-400">{q.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded flex items-center">
                                 <User className="w-3 h-3 mr-1" /> {q.faculty}
                           </div>
                           <button 
                              onClick={(e) => { e.stopPropagation(); handleEditClick(q); }}
                              className="text-slate-400 hover:text-blue-600 transition-colors p-1 hover:bg-slate-50 rounded"
                              title="Edit Question"
                           >
                              <Pencil className="w-4 h-4" />
                           </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div>
                        <h3 className="text-lg font-medium text-slate-800 mb-2">{q.question}</h3>
                        {q.scenario && (
                            <p className="text-sm text-slate-500 italic mb-2 bg-slate-50 p-2 rounded border border-slate-100">
                                "{q.scenario}"
                            </p>
                        )}
                        
                        {q.answer ? (
                          <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-slate-700 text-sm mt-2">
                            <span className="font-bold text-green-700 block mb-1">Answer:</span>
                            {q.answer}
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-sm text-red-400 italic">No answer recorded.</span>
                            <button 
                              onClick={() => handleGetAIAnswer(q.id, q.question, q.diseaseTag)}
                              disabled={loadingAnswer === q.id}
                              className="flex items-center text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                            >
                              {loadingAnswer === q.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin"/> : <Brain className="w-3 h-3 mr-1"/>}
                              Ask AI
                            </button>
                          </div>
                        )}
                    </div>
                    
                    {/* Footer/Link */}
                    {patient && (
                        <div className="pt-3 border-t border-slate-100 flex justify-end items-center text-xs">
                            <span className="text-slate-400 mr-2">Linked Patient:</span>
                            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-1 rounded">{patient.name} ({patient.ward})</span>
                        </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RoundsTracker;
