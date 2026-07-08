import React, { useMemo } from 'react';
import { PoolSettings } from '../../types';

interface AdminAxisNumbersProps {
  poolSettings: PoolSettings;
  onUpdatePoolSettings: (updates: Partial<PoolSettings>) => void;
  onGenerateNumbers: () => void;
}

const AdminAxisNumbers: React.FC<AdminAxisNumbersProps> = ({ poolSettings, onUpdatePoolSettings, onGenerateNumbers }) => {
  const getAxisStatus = (nums: number[]) => {
    const present = new Set<number>();
    const duplicates = new Set<number>();
    const filtered = (nums || []).filter(n => n !== null && !isNaN(n));
    filtered.forEach(n => {
      if (present.has(n)) duplicates.add(n);
      present.add(n);
    });
    const missing = [];
    for (let i = 0; i <= 9; i++) if (!present.has(i)) missing.push(i);
    const isValid = missing.length === 0 && duplicates.size === 0 && filtered.length === 10;
    return { isValid, missing, duplicates: Array.from(duplicates), count: filtered.length };
  };

  const rowStatus = useMemo(() => getAxisStatus(poolSettings.rowNumbers), [poolSettings.rowNumbers]);
  const colStatus = useMemo(() => getAxisStatus(poolSettings.colNumbers), [poolSettings.colNumbers]);

  const clearAxis = (type: 'row' | 'col') => {
    const key = type === 'row' ? 'rowNumbers' : 'colNumbers';
    onUpdatePoolSettings({ [key]: Array(10).fill(null) });
  };

  const handleAxisNumberChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'row' | 'col', index: number) => {
    const valStr = e.target.value.replace(/[^0-9]/g, '');
    const num = valStr === '' ? null : parseInt(valStr, 10);
    const key = type === 'row' ? 'rowNumbers' : 'colNumbers';
    const currentAxis = [...(poolSettings[key] || Array(10).fill(null))];
    currentAxis[index] = num;
    onUpdatePoolSettings({ [key]: currentAxis });
    if (valStr !== '' && index < 9) {
      const parent = e.target.closest('.axis-row');
      const inputs = parent?.querySelectorAll('input');
      (inputs?.[index + 1] as HTMLInputElement)?.focus();
    }
  };

  const ValidationBadge = ({ status }: { status: ReturnType<typeof getAxisStatus> }) => {
    if (status.isValid) return <span className="text-[8px] font-black text-green-500 uppercase bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Ready</span>;
    return (
      <div className="flex flex-wrap gap-2">
        {status.duplicates.length > 0 && <span className="text-[8px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded-full border border-red-100">Dupes: {status.duplicates.join(',')}</span>}
        {status.missing.length > 0 && <span className="text-[8px] font-black text-orange-500 uppercase bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">Missing: {status.missing.join(',')}</span>}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight">Grid Axis Numbers</h3>
          <p className="text-[9px] font-black text-indigo-400 uppercase">Values 0-9 for grid coordinates</p>
        </div>
        <button onClick={onGenerateNumbers} className="w-full md:w-auto bg-indigo-900 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-indigo-100 hover:bg-black transition-all"><i className="fas fa-random mr-2"></i> Randomize Numbers</button>
      </div>
      <div className="space-y-10">
        <div className="axis-row">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4"><label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{poolSettings.teamA} (Vertical)</label><ValidationBadge status={rowStatus} /></div>
            <button onClick={() => clearAxis('row')} className="text-[8px] font-black text-red-400 uppercase"><i className="fas fa-eraser mr-1"></i> Clear</button>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <input title={`Row axis number ${i + 1}`} key={`row-${i}`} type="text" maxLength={1} onFocus={(e) => e.target.select()} value={poolSettings.rowNumbers[i] ?? ''} onChange={(e) => handleAxisNumberChange(e, 'row', i)} className="w-full h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-indigo-900 outline-none focus:border-indigo-500" placeholder="?" />
            ))}
          </div>
        </div>
        <div className="axis-row">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4"><label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">{poolSettings.teamB} (Horizontal)</label><ValidationBadge status={colStatus} /></div>
            <button onClick={() => clearAxis('col')} className="text-[8px] font-black text-red-400 uppercase"><i className="fas fa-eraser mr-1"></i> Clear</button>
          </div>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <input title={`Column axis number ${i + 1}`} key={`col-${i}`} type="text" maxLength={1} onFocus={(e) => e.target.select()} value={poolSettings.colNumbers[i] ?? ''} onChange={(e) => handleAxisNumberChange(e, 'col', i)} className="w-full h-12 text-center bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-indigo-900 outline-none focus:border-indigo-500" placeholder="?" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAxisNumbers;
