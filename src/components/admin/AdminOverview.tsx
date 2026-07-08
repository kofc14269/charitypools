import React, { useState } from 'react';
import { Pool } from '../../types';

interface AdminOverviewProps {
  financialSummary: {
    totalPot: number;
    charityAmount: number;
    playerPot: number;
  };
  ownerUid?: string | null;
  activePoolId?: string;
  pools?: Pool[];
}

const CopyButton: React.FC<{ url: string }> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex-shrink-0 px-5 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-2 ${
        copied ? 'bg-green-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
      }`}
    >
      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const AdminOverview: React.FC<AdminOverviewProps> = ({ financialSummary, ownerUid, activePoolId, pools }) => {
  const origin = `${window.location.origin}${window.location.pathname}`;

  const orgLink = ownerUid ? `${origin}?u=${ownerUid}` : null;

  const contestLinks = ownerUid && pools && pools.length > 0
    ? pools.map(pool => ({
        pool,
        url: `${origin}?u=${ownerUid}&p=${pool.id}`,
        isActive: pool.id === activePoolId,
      }))
    : [];

  return (
    <div className="space-y-12">

      {/* Per-Contest Public Links */}
      {contestLinks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-link text-indigo-600 text-xs"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-950 uppercase tracking-tight">Contest Public Links</h3>
              <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Each link opens a specific contest for participants</p>
            </div>
          </div>

          <div className="space-y-3">
            {contestLinks.map(({ pool, url, isActive }) => (
              <div
                key={pool.id}
                className={`rounded-2xl p-5 relative overflow-hidden transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-900 to-indigo-800 shadow-xl border border-indigo-700/50'
                    : 'bg-indigo-50 border border-indigo-100'
                }`}
              >
                {/* decorative bg icon */}
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 text-[60px] pointer-events-none select-none ${isActive ? 'text-white/5' : 'text-indigo-100'}`}>
                  <i className={`fas ${pool.type === 'survivor' ? 'fa-football-ball' : pool.type === '13run' ? 'fa-baseball-ball' : 'fa-th'}`}></i>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                      isActive ? 'bg-white/15 text-amber-300' : 'bg-indigo-200/60 text-indigo-600'
                    }`}>
                      {pool.type?.toUpperCase() || 'SQUARES'}
                    </span>
                    <span className={`text-sm font-black uppercase ${isActive ? 'text-white' : 'text-indigo-900'}`}>
                      {pool.name}
                    </span>
                    {isActive && (
                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        ● Active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`flex-1 px-4 py-2.5 rounded-xl font-mono text-[10px] truncate select-all ${
                      isActive ? 'bg-white/10 text-white/70 border border-white/10' : 'bg-white text-indigo-400 border border-indigo-100'
                    }`}>
                      {url}
                    </div>
                    <CopyButton url={url} />
                    <a
                      href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(url)}&margin=10`}
                      target="_blank"
                      rel="noreferrer"
                      title="View QR Code"
                      className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        isActive ? 'bg-white/15 hover:bg-white/25 text-white' : 'bg-white hover:bg-indigo-50 text-indigo-400 border border-indigo-100'
                      }`}
                    >
                      <i className="fas fa-qrcode text-sm"></i>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Org-Wide Link (fallback / all-contests link) */}
      {orgLink && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-100 text-[60px] pointer-events-none select-none">
            <i className="fas fa-users"></i>
          </div>
          <div className="relative z-10">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Organization Link</p>
            <p className="text-[10px] text-slate-500 mb-3 font-medium">Opens whichever contest is currently active. Share contest-specific links above instead for best results.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl font-mono text-[10px] text-slate-400 bg-white border border-slate-200 truncate select-all">
                {orgLink}
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(orgLink); }}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest bg-slate-200 hover:bg-slate-300 text-slate-600 transition-all flex items-center gap-2"
              >
                <i className="fas fa-copy"></i> Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary */}
      <div>
        <h3 className="text-xl font-black text-indigo-900 uppercase mb-6">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-indigo-50 p-6 rounded-3xl text-center flex flex-col justify-center">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Projected Total Pot</p>
            <p className="text-4xl font-black text-indigo-900">${financialSummary.totalPot}</p>
          </div>
          <div className="bg-indigo-900 p-6 rounded-3xl text-center text-white flex flex-col justify-center shadow-xl">
            <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1">Charity Portion</p>
            <p className="text-4xl font-black">${financialSummary.charityAmount.toFixed(0)}</p>
          </div>
          <div className="bg-green-50 p-6 rounded-3xl text-center flex flex-col justify-center border border-green-100">
            <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">Player Pool</p>
            <p className="text-4xl font-black text-green-700">${financialSummary.playerPot.toFixed(0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
