
import React, { useState, useMemo } from 'react';
import { AppState, Pool, Participant, Square } from '../types';

interface PlayerProfileProps {
  state: AppState;
}

const PlayerProfile: React.FC<PlayerProfileProps> = ({ state }) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQr, setActiveQr] = useState<string | null>(null);

  const playerStats = useMemo(() => {
    if (!searchQuery) return null;
    
    const results: { 
      pool: Pool, 
      participant: Participant, 
      squares: Square[],
      due: number,
      paid: number
    }[] = [];

    const normalizedSearch = searchQuery.toLowerCase();

    state.pools.forEach(pool => {
      const participant = (pool.participants || []).find(p => 
        p.email.toLowerCase() === normalizedSearch || 
        (p.phone || '').replace(/[^\d]/g, '') === normalizedSearch.replace(/[^\d]/g, '')
      );
      if (participant) {
        const squares = (pool.squares || []).filter(s => s.participantId === participant.id);
        if (squares.length > 0) {
          const totalOwed = squares.length * pool.settings.costPerBox;
          const totalPaid = (participant.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
          results.push({
            pool,
            participant,
            squares,
            due: totalOwed,
            paid: totalPaid
          });
        }
      }
    });

    if (results.length === 0) return null;

    const totalBoxes = results.reduce((acc, r) => acc + r.squares.length, 0);
    const totalDue = results.reduce((acc, r) => acc + r.due, 0);
    const totalPaid = results.reduce((acc, r) => acc + r.paid, 0);
    const netBalance = Math.max(0, totalDue - totalPaid);

    return { results, totalBoxes, totalDue, totalPaid, netBalance, alias: results[0].participant.alias };
  }, [searchQuery, state.pools]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
    setActiveQr(null);
  };

  const generateQrUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&margin=10`;

  const PaymentSection = ({ amount, alias }: { amount: number; alias: string }) => {
    const settings = state.globalSettings;
    // Priority: Custom Link > Username
    const paypalUrl = settings.paypalLink || (settings.paypalAccount ? `https://www.paypal.com/paypalme/${settings.paypalAccount}/${amount}` : null);
    const venmoUrl = settings.venmoAccount ? `https://venmo.com/${settings.venmoAccount.replace('@', '')}?txn=pay&amount=${amount}&note=${encodeURIComponent(`Balance: ${alias.toUpperCase()}`)}` : null;
    const zelleInfo = settings.zelleAccount || "";

    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl mx-auto">
        {paypalUrl && (
          <div className="flex flex-col gap-1">
            <a href={paypalUrl} target="_blank" className="flex items-center justify-between gap-2 px-3 py-2 bg-[#003087] text-white rounded-lg font-black uppercase text-[9px] tracking-widest shadow hover:brightness-110 transition-all">
              <span className="flex items-center gap-1"><i className="fab fa-paypal"></i> PayPal</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveQr(activeQr === 'paypal' ? null : 'paypal'); }} className="bg-white/20 px-1.5 py-0.5 rounded text-[7px] hover:bg-white/30 transition-colors">QR</button>
            </a>
            {activeQr === 'paypal' && (
              <div className="bg-white p-2 rounded-xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(paypalUrl)} alt="PayPal QR" className="w-20 h-20" />
              </div>
            )}
          </div>
        )}

        {venmoUrl && (
          <div className="flex flex-col gap-1">
            <a href={venmoUrl} target="_blank" className="flex items-center justify-between gap-2 px-3 py-2 bg-[#3d95ce] text-white rounded-lg font-black uppercase text-[9px] tracking-widest shadow hover:brightness-110 transition-all">
              <span className="flex items-center gap-1"><i className="fab fa-vimeo-v"></i> Venmo</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveQr(activeQr === 'venmo' ? null : 'venmo'); }} className="bg-white/20 px-1.5 py-0.5 rounded text-[7px] hover:bg-white/30 transition-colors">QR</button>
            </a>
            {activeQr === 'venmo' && (
              <div className="bg-white p-2 rounded-xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(venmoUrl)} alt="Venmo QR" className="w-20 h-20" />
              </div>
            )}
          </div>
        )}

        {zelleInfo && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[#6d1ed4] text-white rounded-lg font-black uppercase text-[9px] tracking-widest shadow">
              <button onClick={() => { navigator.clipboard.writeText(zelleInfo); alert("Zelle info copied!"); }} className="flex items-center gap-1 text-left truncate">
                <i className="fas fa-university"></i> Zelle
              </button>
              <button type="button" onClick={() => setActiveQr(activeQr === 'zelle' ? null : 'zelle')} className="bg-white/20 px-1.5 py-0.5 rounded text-[7px] hover:bg-white/30 transition-colors">QR</button>
            </div>
            {activeQr === 'zelle' && (
              <div className="bg-white p-2 rounded-xl border border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(zelleInfo)} alt="Zelle QR" className="w-20 h-20" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-8 animate-in fade-in duration-500">
      {/* Search Header - Compact Slim Version */}
      <section className="bg-indigo-900 text-white rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
          <i className="fas fa-user-shield text-[60px] rotate-12"></i>
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Status Check</h2>
            <p className="text-indigo-300 text-[8px] font-bold uppercase tracking-widest">Verify account balances</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input 
              required
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Email or phone..."
              className="w-full sm:w-56 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white font-bold outline-none focus:border-white focus:bg-white/20 transition-all placeholder:text-indigo-400 text-xs"
            />
            <button type="submit" className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-black uppercase text-[9px] tracking-widest shadow-lg hover:bg-indigo-50 active:scale-95 transition-all">
              Go
            </button>
          </form>
        </div>
      </section>

      {playerStats ? (
        <div className="space-y-4">
          {/* Main Stats Row - Tighter */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-4 flex flex-col items-center text-center">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Squares</span>
                <p className="text-2xl font-black text-indigo-900 leading-none">{playerStats.totalBoxes}</p>
              </div>
              
              <div className="p-4 flex flex-col items-center text-center">
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mb-1">Contributed</span>
                <p className="text-2xl font-black text-gray-900 leading-none">${playerStats.totalPaid}</p>
              </div>

              <div className={`p-4 flex flex-col items-center text-center transition-all ${playerStats.netBalance > 0 ? 'bg-orange-50/30' : 'bg-green-50/30'}`}>
                <span className={`text-[7px] font-black uppercase tracking-widest mb-1 ${playerStats.netBalance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  Balance
                </span>
                {playerStats.netBalance > 0 ? (
                  <p className="text-2xl font-black text-orange-600 leading-none">${playerStats.netBalance}</p>
                ) : (
                  <p className="text-xl font-black text-green-600 leading-none uppercase tracking-tighter">PAID</p>
                )}
              </div>
            </div>

            {/* Integrated Payment Section - Slimmed */}
            {playerStats.netBalance > 0 && (
              <div className="px-4 pb-4 pt-2 border-t border-gray-50 bg-orange-50/20 animate-in slide-in-from-top-2 duration-300">
                <div className="text-center mb-3">
                  <h3 className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Settle Outstanding: ${playerStats.netBalance}</h3>
                </div>
                <PaymentSection amount={playerStats.netBalance} alias={playerStats.alias} />
              </div>
            )}
          </div>

          {/* Breakdown Section - List View instead of Cards */}
          <div className="space-y-2">
            <h3 className="text-[9px] font-black text-indigo-900 uppercase tracking-widest px-2">History Breakdown</h3>
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                {playerStats.results.map((res, idx) => (
                  <div key={idx} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-indigo-50/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex-shrink-0 flex items-center justify-center text-indigo-600">
                        <i className="fas fa-football-ball text-[10px]"></i>
                      </div>
                      <div className="truncate">
                        <h4 className="font-black text-xs text-indigo-900 uppercase truncate">{res.pool.name}</h4>
                        <p className="text-[7px] font-bold text-gray-400 uppercase">
                          {res.squares.length} Box{res.squares.length > 1 ? 'es' : ''} • ({res.squares.map(s => `#${s.id+1}`).join(', ')})
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-xs font-black ${res.paid >= res.due ? 'text-green-600' : 'text-orange-600'}`}>
                        ${res.paid}/${res.due}
                      </p>
                      <span className={`text-[6px] font-black uppercase ${res.paid >= res.due ? 'text-green-500' : 'text-orange-500'}`}>
                        {res.paid >= res.due ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : searchQuery && (
        <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl py-12 text-center animate-in zoom-in-95">
          <i className="fas fa-search-minus text-gray-200 text-2xl mb-2"></i>
          <h4 className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No squares found for this email or phone</h4>
        </div>
      )}
    </div>
  );
};

export default PlayerProfile;
