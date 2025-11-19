
import { GoogleGenAI } from "@google/genai";
import { Patient } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateClinicalAnalysis = async (patient: Patient): Promise<string> => {
  const prompt = `
    Act as a Senior Internal Medicine Attending Physician. Review the following patient case and provide a critical analysis.
    
    **Patient Data:**
    - Name: ${patient.name} (${patient.age}yo ${patient.gender})
    - CC: ${patient.chiefComplaint}
    - HPI: ${patient.historyOfPresentIllness}
    - PMH: ${patient.pastMedicalHistory}
    - Systemic Exam (Admission): ${patient.systemicExamination}
    
    **Latest Vitals:**
    ${patient.vitals.slice(-3).map(v => `${v.date}: BP ${v.bp}, HR ${v.hr}, Temp ${v.temp}`).join('\n')}
    
    **Recent Labs:**
    ${patient.labs.slice(-3).map(l => `${l.date}: ${l.values}`).join('\n')}
    
    **Daily Progress (Last 3 Entries):**
    ${patient.dailyNotes.slice(0, 3).map(n => `[${n.date}]\nS: ${n.subjective}\nO: ${n.objective}\nA/P: ${n.assessmentPlan}`).join('\n\n')}
    
    **Task:**
    1. Provide a Differential Diagnosis (ranked by likelihood).
    2. Critique the current management/plan.
    3. Suggest "Red Flag" signs to watch for.
    4. Provide a brief Prognosis.

    Format the output using Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating clinical analysis. Please try again.";
  }
};

export const answerRoundsQuestion = async (question: string, context: string): Promise<string> => {
    const prompt = `
        You are an expert academic physician. Answer the following medical question asked during rounds.
        
        **Context:** ${context}
        **Question:** ${question}
        
        Keep the answer concise, high-yield, and accurate. Mention key studies or guidelines if relevant.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "No answer generated.";
    } catch (error) {
        console.error(error);
        return "Error fetching answer.";
    }
};

export const generateDischargeSummary = async (patient: Patient): Promise<string> => {
    const prompt = `
        Generate a professional hospital Discharge Summary for the following patient.
        
        **Patient Details:**
        Name: ${patient.name} MRN: ${patient.mrn}
        Admission Date: ${patient.admissionDate}
        
        **Admission Clinical Picture:**
        CC: ${patient.chiefComplaint}
        HPI: ${patient.historyOfPresentIllness}
        Exam: ${patient.systemicExamination}
        
        **Hospital Course:**
        ${patient.hospitalCourse || 'Not explicitly provided, summarize based on notes.'}
        
        **Key Investigations:**
        ${patient.investigations.filter(i => i.status === 'Completed').map(i => `${i.name}: ${i.result}`).join('\n')}
        
        **Treatments Received:**
        ${patient.treatments.map(t => `${t.name} ${t.dose} ${t.route}`).join(', ')}
        
        **Discharge Advice:**
        ${patient.dischargeAdvice}
        
        **Output Format:**
        Standard Medical Discharge Summary format (Diagnosis, History, Course, Meds on Discharge, Follow-up).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Unable to generate summary.";
    } catch (error) {
        console.error("AI Error:", error);
        return "Error generating discharge summary.";
    }
}
