
import React, { useEffect, useRef, useState } from 'react';
import { GlobalSettings } from '../../types';

interface AdminGlobalSettingsProps {
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  handleLogoFile?: (file: File, scope: 'global' | 'pool', team: 'A' | 'B') => void;
  setAndValidateLogoUrl?: (scope: 'global' | 'pool', team: 'A' | 'B', url: string) => Promise<boolean>;
}

const AdminGlobalSettings: React.FC<AdminGlobalSettingsProps> = ({
  globalSettings,
  onUpdateGlobalSettings,
  handleLogoFile,
  setAndValidateLogoUrl,
}) => {
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const [teamALogoInput, setTeamALogoInput] = useState(globalSettings?.teamALogo || '');
  const [teamBLogoInput, setTeamBLogoInput] = useState(globalSettings?.teamBLogo || '');
  const [notificationEmailInput, setNotificationEmailInput] = useState(
    globalSettings?.reservationNotificationEmail || 'kofcsuperbowl@gmail.com'
  );

  useEffect(() => {
    setNotificationEmailInput(globalSettings?.reservationNotificationEmail || 'kofcsuperbowl@gmail.com');
  }, [globalSettings?.reservationNotificationEmail]);

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

      <div className="space-y-6 border-t border-indigo-50 pt-8">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-xl">
              <i className="fas fa-envelope"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Reservation Notifications</h3>
              <p className="text-indigo-300 font-bold uppercase text-[9px] tracking-widest mt-2">Email an administrator when boxes are reserved</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={globalSettings?.reservationNotificationsEnabled !== false}
            onClick={() => onUpdateGlobalSettings({
              reservationNotificationsEnabled: globalSettings?.reservationNotificationsEnabled === false,
            })}
            className={`relative w-14 h-8 rounded-full transition-colors ${globalSettings?.reservationNotificationsEnabled !== false ? 'bg-emerald-500' : 'bg-gray-300'}`}
            title="Toggle reservation email notifications"
          >
            <span className={`absolute left-1 top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${globalSettings?.reservationNotificationsEnabled !== false ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>

        <div className="space-y-3 max-w-xl">
          <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Notification Email Address</label>
          <input
            title="Reservation notification email"
            type="email"
            required
            value={notificationEmailInput}
            disabled={globalSettings?.reservationNotificationsEnabled === false}
            onChange={e => setNotificationEmailInput(e.target.value)}
            onBlur={e => {
              if (e.currentTarget.checkValidity()) {
                onUpdateGlobalSettings({ reservationNotificationEmail: notificationEmailInput.trim() });
              }
            }}
            placeholder="notifications@example.com"
            className="w-full p-5 bg-indigo-50/50 border-2 border-transparent invalid:border-red-300 focus:border-indigo-400 rounded-2xl font-bold text-indigo-950 outline-none transition-all disabled:opacity-50"
          />
          <p className="text-[9px] text-gray-400 italic leading-relaxed">Changes save when you leave this field. The Gmail sending account is not changed.</p>
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

        {/* Payment Setup */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-xl">
              <i className="fas fa-credit-card"></i>
            </div>
            <div>
              <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Payment Setup</h3>
              <p className="text-indigo-300 font-bold uppercase text-[9px] tracking-widest mt-2">Configure PayPal and Venmo for the payment portal</p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">PayPal Username or Link</label>
            <input
              title="PayPal account or link"
              value={globalSettings?.paypalLink || globalSettings?.paypalAccount || ''}
              onChange={e => onUpdateGlobalSettings({ paypalLink: e.target.value })}
              placeholder="https://www.paypal.com/paypalme/yourname"
              className="w-full p-5 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-400 rounded-2xl font-black text-indigo-950 outline-none transition-all placeholder:text-indigo-200"
            />
            <p className="text-[9px] text-gray-400 italic leading-relaxed">Enter a PayPal.Me link or username to enable PayPal payments from the portal. If your PayPal.Me link has no amount, the app will append the current due amount automatically.</p>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Venmo Username</label>
            <input
              title="Venmo username"
              value={globalSettings?.venmoAccount || ''}
              onChange={e => onUpdateGlobalSettings({ venmoAccount: e.target.value })}
              placeholder="@yourvenmo"
              className="w-full p-5 bg-indigo-50/50 border-2 border-transparent focus:border-indigo-400 rounded-2xl font-black text-indigo-950 outline-none transition-all placeholder:text-indigo-200"
            />
            <p className="text-[9px] text-gray-400 italic leading-relaxed">Enter your Venmo handle so users can pay through Venmo directly from the UI.</p>
          </div>
        </div>
      </div>

      {/* Global Team Logos */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-t border-indigo-50 pt-8">
          <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-xl">
            <i className="fas fa-image"></i>
          </div>
          <div>
            <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">Default Team Logos</h3>
            <p className="text-indigo-300 font-bold uppercase text-[9px] tracking-widest mt-2">Applied across all contests unless overridden per pool</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(['A', 'B'] as const).map(team => {
            const logoValue = team === 'A' ? teamALogoInput : teamBLogoInput;
            const setLogoValue = team === 'A' ? setTeamALogoInput : setTeamBLogoInput;
            const savedLogo = team === 'A' ? globalSettings?.teamALogo : globalSettings?.teamBLogo;
            const fileRef = team === 'A' ? fileInputARef : fileInputBRef;
            return (
              <div key={team} className="space-y-3">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">
                  Team {team} Logo
                </label>
                {savedLogo && (
                  <img src={savedLogo} alt={`Team ${team}`} className="h-12 object-contain rounded-xl border border-indigo-50" />
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    title={`Upload team ${team} logo`}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f && handleLogoFile) handleLogoFile(f, 'global', team);
                      e.currentTarget.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex-1 py-3 bg-indigo-50 text-indigo-900 rounded-xl font-black uppercase text-[8px] shadow-sm"
                  >
                    Upload
                  </button>
                  {savedLogo && (
                    <button
                      type="button"
                      onClick={() => onUpdateGlobalSettings(team === 'A' ? { teamALogo: '' } : { teamBLogo: '' })}
                      className="px-3 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[8px]"
                    >
                      X
                    </button>
                  )}
                </div>
                <input
                  title={`Team ${team} logo URL`}
                  value={logoValue}
                  onChange={e => setLogoValue(e.target.value)}
                  onBlur={async () => {
                    if (!setAndValidateLogoUrl) return;
                    const saved = await setAndValidateLogoUrl('global', team, logoValue);
                    if (!saved) {
                      setLogoValue(savedLogo || '');
                    }
                  }}
                  placeholder="https://.../logo.png"
                  className="w-full p-3 bg-indigo-50 border-none rounded-xl text-[10px] font-bold outline-none"
                />
              </div>
            );
          })}
        </div>
        <p className="text-[9px] font-bold text-gray-300 uppercase italic">Individual contests can override these logos in their pool options.</p>
      </div>
    </div>
  );
};

export default AdminGlobalSettings;
