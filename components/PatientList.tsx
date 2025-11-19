
import React, { useState } from 'react';
import { Patient, Urgency, Todo } from '../types';
import { User, Activity, AlertCircle, Plus, MapPin, Fingerprint, Hash } from 'lucide-react';

interface PatientListProps {
  patients: Patient[];
  onSelectPatient: (id: string) => void;
  onAddPatient: () => void;
}

const PatientList: React.FC<PatientListProps> = ({ patients, onSelectPatient, onAddPatient }) => {
  const [filter, setFilter] = useState('');

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase()) || 
    p.mrn.includes(filter) ||
    (p.uhid && p.uhid.toLowerCase().includes(filter.toLowerCase())) ||
    (p.ipNumber && p.ipNumber.toLowerCase().includes(filter.toLowerCase())) ||
    (p.address && p.address.toLowerCase().includes(filter.toLowerCase())) ||
    p.chiefComplaint.toLowerCase().includes(filter.toLowerCase()) ||
    p.ward.toLowerCase().includes(filter.toLowerCase())
  );

  const getUrgentTodosCount = (todos: Todo[]) => todos.filter(t => !t.completed && t.urgency === Urgency.CRITICAL).length;

  const getWardColor = (ward: string) => {
    switch(ward) {
      case 'RED ZONE': return 'bg-red-100 text-red-700 border-red-200';
      case 'EICU':
      case 'MICU': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Inpatient Dashboard</h1>
          <p className="text-slate-500 mt-1">Welcome back, Dr. Resident</p>
        </div>
        <button 
          onClick={onAddPatient}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center shadow-md transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Admission
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by Name, UHID, IP No, Address, Diagnosis..."
          className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
        {filteredPatients.map(patient => {
          const criticalTodos = getUrgentTodosCount(patient.todos);
          const lastVitals = patient.vitals[patient.vitals.length - 1];

          return (
            <div 
              key={patient.id}
              onClick={() => onSelectPatient(patient.id)}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg mr-3">
                    {patient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{patient.name}</h3>
                    <div className="text-xs text-slate-500 flex gap-2">
                      <span>{patient.age}yo {patient.gender}</span>
                      {patient.uhid && (
                        <>
                          <span>•</span>
                          <span>UHID: {patient.uhid}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {criticalTodos > 0 && (
                  <div className="flex items-center text-red-500 bg-red-50 px-2 py-1 rounded text-xs font-medium animate-pulse">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {criticalTodos}
                  </div>
                )}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center ${getWardColor(patient.ward)}`}>
                    <MapPin className="w-3 h-3 mr-1" />
                    {patient.ward}
                 </span>
                 {patient.ipNumber && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-500 flex items-center">
                      <Hash className="w-3 h-3 mr-1" /> IP: {patient.ipNumber}
                    </span>
                 )}
              </div>
              
              {patient.address && (
                 <div className="mb-3 flex items-start text-xs text-slate-400">
                    <MapPin className="w-3 h-3 mr-1 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{patient.address}</span>
                 </div>
              )}

              <div className="mb-4">
                <p className="text-sm text-slate-600 font-medium mb-1">CC: {patient.chiefComplaint || 'No complaint listed'}</p>
                <p className="text-xs text-slate-400 line-clamp-2">{patient.historyOfPresentIllness || 'No history listed'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                 <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-xs text-slate-400 block uppercase tracking-wider">Last Temp</span>
                    <span className="font-mono text-sm font-medium">{lastVitals ? `${lastVitals.temp}°C` : '--'}</span>
                 </div>
                 <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-xs text-slate-400 block uppercase tracking-wider">Last BP</span>
                    <span className="font-mono text-sm font-medium">{lastVitals ? lastVitals.bp : '--'}</span>
                 </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                 <div className="text-xs text-slate-400">Admitted: {patient.admissionDate}</div>
                 <div className="flex items-center text-xs text-blue-600 font-medium">
                    View Chart <Activity className="w-3 h-3 ml-1" />
                 </div>
              </div>
            </div>
          );
        })}
        
        {filteredPatients.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
            <User className="w-12 h-12 mb-3 opacity-20" />
            <p>No patients found matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientList;
