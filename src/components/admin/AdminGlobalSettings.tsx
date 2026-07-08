
import React, { useEffect, useRef, useState } from 'react';
import { GlobalSettings } from '../../types';

interface AdminGlobalSettingsProps {
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  handleLogoFile: (file: File, scope: 'global' | 'pool', team: 'A' | 'B') => Promise<void>;
  setAndValidateLogoUrl: (scope: 'global' | 'pool', team: 'A' | 'B', url: string) => Promise<boolean>;
}

const AdminGlobalSettings: React.FC<AdminGlobalSettingsProps> = ({
  globalSettings,
  onUpdateGlobalSettings,
  handleLogoFile,
  setAndValidateLogoUrl
}) => {
  const globalLogoARef = useRef<HTMLInputElement>(null);
  const globalLogoBRef = useRef<HTMLInputElement>(null);
  const [teamALogoInput, setTeamALogoInput] = useState(globalSettings?.teamALogo || '');
  const [teamBLogoInput, setTeamBLogoInput] = useState(globalSettings?.teamBLogo || '');

  useEffect(() => {
    setTeamALogoInput(globalSettings?.teamALogo || '');
  }, [globalSettings?.teamALogo]);

  useEffect(() => {
    setTeamBLogoInput(globalSettings?.teamBLogo || '');
  }, [globalSettings?.teamBLogo]);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 border-b border-indigo-50 pb-6">
        <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-xl">
          <i className="fas fa-university"></i>
        </div>
        <div>
          <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Organization Branding</h3>
          <p className="text-indigo-300 font-bold uppercase text-[9px] tracking-widest mt-2">Manage your charity's global identity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Charity Name */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Official Charity Name</label>
          <input
            title="Charity name"
            value={globalSettings?.charityName || ''}
            onChange={e => onUpdateGlobalSettings({ charityName: e.target.value })}
            placeholder="e.g. Kofc Charity Pools"
            className="w-full p-5 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-400 rounded-2xl font-black text-indigo-950 uppercase outline-none transition-all placeholder:text-indigo-200"
          />
          <p className="text-[9px] font-medium text-gray-400 italic leading-relaxed">This name appears as the primary benefactor across all your public board headers.</p>
        </div>

        {/* Global Logos */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Default Team Logos</label>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 bg-white border-2 border-dashed border-indigo-100 rounded-3xl flex items-center justify-center overflow-hidden shadow-sm ${!globalSettings?.teamALogo && 'p-6'}`}>
                {globalSettings?.teamALogo ? (
                  <img src={globalSettings.teamALogo} alt="Default team A logo" className="w-full h-full object-contain" />
                ) : (
                  <i className="fas fa-image text-indigo-100 text-3xl"></i>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Team A Default</label>
                <input
                  title="Team A logo URL"
                  value={teamALogoInput}
                  onChange={e => setTeamALogoInput(e.target.value)}
                  onBlur={async () => {
                    const saved = await setAndValidateLogoUrl('global', 'A', teamALogoInput);
                    if (!saved) setTeamALogoInput(globalSettings?.teamALogo || '');
                  }}
                  className="p-3 bg-indigo-50 border-none rounded-xl text-[10px] w-full font-bold outline-none"
                  placeholder="https://.../logo.png"
                />
                <div className="flex gap-2">
                  <input title="Upload team A default logo" ref={globalLogoARef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoFile(f, 'global', 'A'); e.currentTarget.value = ''; }} className="hidden" />
                  <button type="button" onClick={() => globalLogoARef.current?.click()} className="px-4 py-2 bg-white border border-indigo-100 text-indigo-900 rounded-xl font-black uppercase text-[9px] shadow-sm hover:bg-indigo-50">Upload File</button>
                  {globalSettings?.teamALogo && <button type="button" onClick={() => onUpdateGlobalSettings({ teamALogo: '' })} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[9px]">Clear</button>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 bg-white border-2 border-dashed border-indigo-100 rounded-3xl flex items-center justify-center overflow-hidden shadow-sm ${!globalSettings?.teamBLogo && 'p-6'}`}>
                {globalSettings?.teamBLogo ? (
                  <img src={globalSettings.teamBLogo} alt="Default team B logo" className="w-full h-full object-contain" />
                ) : (
                  <i className="fas fa-image text-indigo-100 text-3xl"></i>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Team B Default</label>
                <input
                  title="Team B logo URL"
                  value={teamBLogoInput}
                  onChange={e => setTeamBLogoInput(e.target.value)}
                  onBlur={async () => {
                    const saved = await setAndValidateLogoUrl('global', 'B', teamBLogoInput);
                    if (!saved) setTeamBLogoInput(globalSettings?.teamBLogo || '');
                  }}
                  className="p-3 bg-indigo-50 border-none rounded-xl text-[10px] w-full font-bold outline-none"
                  placeholder="https://.../logo.png"
                />
                <div className="flex gap-2">
                  <input title="Upload team B default logo" ref={globalLogoBRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogoFile(f, 'global', 'B'); e.currentTarget.value = ''; }} className="hidden" />
                  <button type="button" onClick={() => globalLogoBRef.current?.click()} className="px-4 py-2 bg-white border border-indigo-100 text-indigo-900 rounded-xl font-black uppercase text-[9px] shadow-sm hover:bg-indigo-50">Upload File</button>
                  {globalSettings?.teamBLogo && <button type="button" onClick={() => onUpdateGlobalSettings({ teamBLogo: '' })} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[9px]">Clear</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalSettings;
