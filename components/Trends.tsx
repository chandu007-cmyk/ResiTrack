
import React from 'react';
import { VitalSign, LabResult } from '../types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendsProps {
  vitals: VitalSign[];
  labs?: LabResult[];
  type: 'vitals' | 'labs';
}

const Sparkline: React.FC<{ data: number[], color: string, height?: number }> = ({ data, color, height = 40 }) => {
  if (data.length < 2) return <div className="h-10 flex items-center text-xs text-slate-400">Insufficient Data</div>;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    // Invert Y because SVG 0 is top
    const y = height - ((val - min) / range) * (height - 10) - 5; 
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle cx={width} cy={height - ((data[data.length-1] - min) / range) * (height - 10) - 5} r="3" fill={color} />
    </svg>
  );
};

const TrendCard: React.FC<{ label: string, value: string, data: number[], unit: string, color: string }> = ({ label, value, data, unit, color }) => {
    // Calculate simple trend direction
    let TrendIcon = Minus;
    let trendColor = 'text-slate-400';
    
    if (data.length >= 2) {
        const last = data[data.length - 1];
        const prev = data[data.length - 2];
        if (last > prev) { TrendIcon = TrendingUp; trendColor = 'text-red-500'; } // Generally up is "alert" in medicine context often, but depends
        else if (last < prev) { TrendIcon = TrendingDown; trendColor = 'text-green-500'; }
    }

    return (
        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px]">
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
                <div className="text-right">
                    <div className="text-lg font-bold text-slate-800 leading-none">{value}</div>
                    <span className="text-[10px] text-slate-400">{unit}</span>
                </div>
            </div>
            <div className="flex-1 flex items-end">
                <Sparkline data={data} color={color} />
            </div>
        </div>
    );
};

export const VitalTrends: React.FC<{ vitals: VitalSign[] }> = ({ vitals }) => {
  // Extract data series
  const sysBp = vitals.map(v => parseInt(v.bp.split('/')[0]) || 0).filter(n => n > 0);
  const diaBp = vitals.map(v => parseInt(v.bp.split('/')[1]) || 0).filter(n => n > 0);
  const hr = vitals.map(v => v.hr);
  const temp = vitals.map(v => v.temp);
  const o2 = vitals.map(v => v.o2);

  const lastVital = vitals[vitals.length - 1] || {};

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <TrendCard label="SBP" value={lastVital.bp?.split('/')[0] || '--'} unit="mmHg" data={sysBp} color="#ef4444" />
        <TrendCard label="HR" value={lastVital.hr?.toString() || '--'} unit="bpm" data={hr} color="#3b82f6" />
        <TrendCard label="Temp" value={lastVital.temp?.toString() || '--'} unit="°C" data={temp} color="#f97316" />
        <TrendCard label="SpO2" value={lastVital.o2?.toString() || '--'} unit="%" data={o2} color="#06b6d4" />
    </div>
  );
};

export const LabTrends: React.FC<{ labs: LabResult[] }> = ({ labs }) => {
    if (!labs || labs.length === 0) return <div className="text-xs text-slate-400 italic">No lab data to trend.</div>;

    // Regex parsers for common labs
    const extract = (regex: RegExp) => {
        return labs.map(l => {
            const match = l.values.match(regex);
            return match ? parseFloat(match[1]) : null;
        }).filter((v): v is number => v !== null);
    };

    const crData = extract(/(?:Cr|Creatinine|Creat)\s*[:=]?\s*(\d+\.?\d*)/i);
    const hgbData = extract(/(?:Hb|Hgb|Hemoglobin)\s*[:=]?\s*(\d+\.?\d*)/i);
    const wbcData = extract(/(?:WBC|Leukocytes)\s*[:=]?\s*(\d+\.?\d*)/i);
    const naData = extract(/(?:Na|Sodium)\s*[:=]?\s*(\d+\.?\d*)/i);

    // Get latest values from the text of the last lab entry
    const lastLabText = labs[labs.length - 1]?.values || '';
    const getLatest = (regex: RegExp) => {
        const match = lastLabText.match(regex);
        return match ? match[1] : '--';
    };

    const count = [crData, hgbData, wbcData, naData].filter(d => d.length > 0).length;

    if (count === 0) return <div className="text-xs text-slate-400 italic p-4 text-center">No standard labs (Cr, Hb, WBC, Na) detected in text to graph.</div>;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {crData.length > 0 && <TrendCard label="Creatinine" value={getLatest(/(?:Cr|Creatinine|Creat)\s*[:=]?\s*(\d+\.?\d*)/i)} unit="mg/dL" data={crData} color="#8b5cf6" />}
            {hgbData.length > 0 && <TrendCard label="Hemoglobin" value={getLatest(/(?:Hb|Hgb|Hemoglobin)\s*[:=]?\s*(\d+\.?\d*)/i)} unit="g/dL" data={hgbData} color="#ec4899" />}
            {wbcData.length > 0 && <TrendCard label="WBC" value={getLatest(/(?:WBC|Leukocytes)\s*[:=]?\s*(\d+\.?\d*)/i)} unit="K/uL" data={wbcData} color="#10b981" />}
            {naData.length > 0 && <TrendCard label="Sodium" value={getLatest(/(?:Na|Sodium)\s*[:=]?\s*(\d+\.?\d*)/i)} unit="mEq/L" data={naData} color="#f59e0b" />}
        </div>
    );
};
