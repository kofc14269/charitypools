
import React, { useMemo, useState } from 'react';
import { Square, GameSettings, Participant, PaymentTransaction } from '../types';

interface StatsProps {
  squares: Square[];
  participants: Participant[];
  settings: GameSettings;
  onUpdateSquare: (id: number, updates: Partial<Square>) => void;
  onUpdateParticipant: (id: string, updates: Partial<Participant>) => void;
  onUnassignSquare: (id: number) => void;
  onClearUserBoxes: (participantId: string) => void;
  onApplyPayment: (participantId: string, amount: number, method: string, note?: string) => void;
  onEditPayment: (participantId: string, transactionId: string, amount: number, method: string, note?: string) => void;
  onDeletePayment: (participantId: string, transactionId: string) => void;
}

const Stats: React.FC<StatsProps> = ({ 
  squares, 
  participants, 
  settings, 
  onUpdateSquare, 
  onUpdateParticipant,
  onUnassignSquare,
  onClearUserBoxes,
  onApplyPayment,
  onEditPayment,
  onDeletePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalParticipant, setPaymentModalParticipant] = useState<any | null>(null);
  const [historyModalParticipant, setHistoryModalParticipant] = useState<any | null>(null);
  const [manageBoxesParticipant, setManageBoxesParticipant] = useState<any | null>(null);
  const [editModalParticipant, setEditModalParticipant] = useState<Participant | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alias: ''
  });

  const costPerBox = settings?.costPerBox || 10;
  const safeParticipants = useMemo(() => participants || [], [participants]);
  const safeSquares = useMemo(() => squares || [], [squares]);

  const roster = useMemo(() => {
    return safeParticipants.map(p => {
      const userSquares = safeSquares.filter(s => s.participantId === p.id);
      const totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
      const totalOwed = userSquares.length * costPerBox;
      return {
        ...p,
        boxCount: userSquares.length,
        totalPaid,
        totalOwed,
        squareIds: userSquares.map(s => s.id),
      };
    }).sort((a, b) => (a.alias || '').localeCompare(b.alias || ''));
  }, [safeSquares, safeParticipants, costPerBox]);

  const allTransactions = useMemo(() => {
    const txs: { pAlias: string, pName: string, pEmail: string, pPhone: string, pId: string, t: PaymentTransaction }[] = [];
    roster.forEach(p => {
      (p.paymentHistory || []).forEach(t => {
        txs.push({ pAlias: p.alias, pName: p.name, pEmail: p.email, pPhone: p.phone, pId: p.id, t });
      });
    });
    return txs.sort((a, b) => b.t.timestamp - a.t.timestamp);
  }, [roster]);

  const totals = useMemo(() => {
    const totalPotential = safeSquares.filter(s => s.assigned).length * costPerBox;
    const totalCollected = roster.reduce((sum, p) => sum + (p.totalPaid || 0), 0);
    return {
      totalDue: totalPotential,
      totalCollected: totalCollected,
      outstanding: Math.max(0, totalPotential - totalCollected),
      percentCollected: totalPotential > 0 ? (totalCollected / totalPotential) * 100 : 0
    };
  }, [safeSquares, costPerBox, roster]);

  const filteredRoster = roster.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.alias || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (allTransactions.length === 0) return;
    const headers = ["Timestamp", "Alias", "Full Name", "Email", "Phone", "Amount", "Method"];
    const rows = allTransactions.map(({ pAlias, pName, pEmail, pPhone, t }) => [
      new Date(t.timestamp).toLocaleString().replace(',', ''), pAlias, pName, pEmail, pPhone, t.amount.toFixed(2), t.method
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `payouts_audit_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
  };

  const openAddPaymentModal = (p: any) => {
    const balance = Math.max(0, (p.totalOwed || 0) - (p.totalPaid || 0));
    setPaymentModalParticipant(p);
    setEditingTransactionId(null);
    setPaymentAmount(balance > 0 ? balance.toString() : '');
    setPaymentMethod('Cash');
    setPaymentNote('');
  };

  const openEditPaymentModal = (p: any, t: PaymentTransaction) => {
    setPaymentModalParticipant(p);
    setEditingTransactionId(t.id);
    setPaymentAmount(t.amount.toString());
    setPaymentMethod(t.method);
    setPaymentNote(t.note || '');
  };

  const openEditParticipantModal = (p: Participant) => {
    setEditModalParticipant(p);
    setEditFormData({ name: p.name, email: p.email, phone: p.phone, alias: p.alias.toUpperCase() });
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalParticipant) return;
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount >= 0) {
      if (editingTransactionId) onEditPayment(paymentModalParticipant.id, editingTransactionId, amount, paymentMethod, paymentNote);
      else onApplyPayment(paymentModalParticipant.id, amount, paymentMethod, paymentNote);
      setPaymentModalParticipant(null);
      setEditingTransactionId(null);
      setPaymentNote('');
    }
  };

  const handleConfirmEditParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalParticipant) return;
    onUpdateParticipant(editModalParticipant.id, { ...editFormData, alias: editFormData.alias.toUpperCase() });
    setEditModalParticipant(null);
  };

  const handleDeleteTransactionInModal = () => {
    if (!paymentModalParticipant || !editingTransactionId) return;
    if (window.confirm(`Delete this $${paymentAmount} entry for ${paymentModalParticipant.alias}?`)) {
      onDeletePayment(paymentModalParticipant.id, editingTransactionId);
      setPaymentModalParticipant(null);
      setEditingTransactionId(null);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const len = phoneNumber.length;
    if (len < 4) return phoneNumber;
    if (len < 7) return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-indigo-900 p-4 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-xl">
          <p className="text-indigo-300 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Total Pledged</p>
          <p className="text-xl md:text-4xl font-black">${totals.totalDue}</p>
        </div>
        <div className="bg-white border-2 border-green-500/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
          <p className="text-green-600 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Collected</p>
          <p className="text-xl md:text-4xl font-black text-gray-900">${totals.totalCollected}</p>
        </div>
        <div className="bg-white border-2 border-orange-500/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
          <p className="text-orange-600 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Outstanding</p>
          <p className="text-xl md:text-4xl font-black text-gray-900">${totals.outstanding}</p>
        </div>
        <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2">
           <span className="text-xl md:text-2xl font-black text-indigo-900">{Math.round(totals.percentCollected)}%</span>
           <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase leading-none">Goal<br/>Progress</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="p-4 md:p-8 border-b bg-gray-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase">Participant Roster</h3>
          <div className="relative w-full md:w-64">
            <input type="text" placeholder="Filter names..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-4 md:px-8 py-3 md:py-5">Player</th>
                <th className="px-4 md:px-8 py-3 md:py-5">Money Status</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRoster.map((p) => {
                const balance = Math.max(0, (p.totalOwed || 0) - (p.totalPaid || 0));
                return (
                  <tr key={p.id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-4 md:px-8 py-4">
                      <p className="font-black text-xs md:text-sm text-gray-900 truncate max-w-[120px]">{p.alias.toUpperCase() || 'GUEST'}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">{p.boxCount || 0} Boxes</p>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className={`text-xs md:text-sm font-black ${balance === 0 ? 'text-green-600' : 'text-indigo-900'}`}>${p.totalPaid || 0}</span>
                        {balance > 0 && <span className="text-[8px] text-red-500 font-bold uppercase">Due: ${balance}</span>}
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setManageBoxesParticipant(p)} className="bg-orange-50 text-orange-600 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all shadow-sm" title="Manage Boxes"><i className="fas fa-th text-xs"></i></button>
                        <button onClick={() => openEditParticipantModal(p)} className="bg-gray-100 text-gray-500 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-900 hover:text-white transition-all shadow-sm" title="Edit Profile"><i className="fas fa-user-edit text-xs"></i></button>
                        <button onClick={() => setHistoryModalParticipant(p)} className="bg-indigo-50 text-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-500 hover:text-white transition-all shadow-sm" title="Payment History"><i className="fas fa-history text-xs"></i></button>
                        <button onClick={() => openAddPaymentModal(p)} className="bg-green-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg shadow-green-100"><i className="fas fa-plus mr-1"></i> Add</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center"><i className="fas fa-receipt text-xs"></i></div>
             <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Global Audit Trail</h3>
          </div>
          <button type="button" onClick={handleExportCSV} disabled={allTransactions.length === 0} className="bg-indigo-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50">
            <i className="fas fa-file-csv"></i> Export CSV
          </button>
        </div>
        <div className="bg-white border border-gray-100 rounded-[2rem] md:rounded-[2.5rem] shadow-xl overflow-hidden">
          {allTransactions.length === 0 ? (
            <div className="py-20 text-center"><i className="fas fa-receipt text-gray-200 text-4xl mb-4"></i><p className="text-gray-400 font-black uppercase text-[10px] tracking-widest">No transactions recorded</p></div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto scrollbar-hide">
              {allTransactions.map(({ pAlias, pId, t }) => (
                <div key={t.id} className="p-5 md:p-6 flex flex-col hover:bg-indigo-50 transition-all group cursor-pointer" onClick={() => { const p = roster.find(r => r.id === pId); if (p) openEditPaymentModal(p, t); }}>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-grow">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 ${t.method === 'Venmo' ? 'bg-blue-50 text-blue-500' : t.method === 'PayPal' ? 'bg-[#003087] text-white' : t.method === 'Cash' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            <i className={`fas ${t.method === 'Venmo' ? 'fa-vimeo-v' : t.method === 'PayPal' ? 'fa-paypal' : t.method === 'Cash' ? 'fa-money-bill-wave' : 'fa-credit-card'} text-xs`}></i>
                         </div>
                         <div className="min-w-0">
                            <p className="text-xs font-black text-indigo-900 uppercase">{pAlias.toUpperCase()}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{t.method} • {new Date(t.timestamp).toLocaleString()}</p>
                         </div>
                      </div>
                      <div className="text-right flex items-center gap-4 flex-shrink-0"><div className="flex flex-col items-end"><p className="text-sm md:text-base font-black text-indigo-900">${t.amount.toFixed(2)}</p></div><i className="fas fa-chevron-right text-gray-200 text-xs"></i></div>
                   </div>
                   {t.note && <p className="text-[9px] text-gray-500 italic mt-2 ml-14">{t.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {historyModalParticipant && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                 <div>
                    <h3 className="font-black uppercase text-sm">{historyModalParticipant.alias}'s History</h3>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-1">Total: ${historyModalParticipant.totalPaid}</p>
                 </div>
                 <button onClick={() => setHistoryModalParticipant(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><i className="fas fa-times"></i></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-hide">
                 {!historyModalParticipant.paymentHistory || historyModalParticipant.paymentHistory.length === 0 ? <div className="py-12 text-center text-gray-400 italic text-xs">No transactions.</div> : (
                    historyModalParticipant.paymentHistory.slice().reverse().map((t: PaymentTransaction) => (
                       <div key={t.id} onClick={() => { setHistoryModalParticipant(null); openEditPaymentModal(historyModalParticipant, t); }} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col group cursor-pointer hover:border-indigo-200 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                               <p className="text-sm font-black text-indigo-900">${t.amount.toFixed(2)}</p>
                               <div className="flex gap-2 mt-1"><span className="text-[8px] font-black uppercase text-gray-400 px-2 py-0.5 bg-gray-200 rounded-md">{t.method}</span><span className="text-[8px] font-black uppercase text-gray-400 px-2 py-0.5 bg-gray-200 rounded-md">{new Date(t.timestamp).toLocaleDateString()}</span></div>
                            </div>
                            <i className="fas fa-edit text-indigo-200 group-hover:text-indigo-500 transition-colors"></i>
                          </div>
                          {t.note && <p className="text-[9px] text-gray-600 italic mt-2 pt-2 border-t border-gray-200">{t.note}</p>}
                       </div>
                    ))
                 )}
              </div>
              <div className="p-6 border-t border-gray-100"><button onClick={() => setHistoryModalParticipant(null)} className="w-full py-4 bg-gray-50 rounded-2xl font-black text-[10px] uppercase text-gray-400 tracking-widest hover:bg-gray-100 transition-all">Close</button></div>
           </div>
        </div>
      )}

      {manageBoxesParticipant && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
           <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
              <div className="bg-indigo-900 p-6 text-white flex justify-between items-center">
                 <div>
                    <h3 className="font-black uppercase text-sm">Manage {manageBoxesParticipant.alias}'s Boxes</h3>
                    <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mt-1">{manageBoxesParticipant.boxCount} box{manageBoxesParticipant.boxCount !== 1 ? 'es' : ''}</p>
                 </div>
                 <button onClick={() => setManageBoxesParticipant(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"><i className="fas fa-times"></i></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 scrollbar-hide">
                 <div className="flex justify-end mb-2">
                    <button onClick={() => { onClearUserBoxes(manageBoxesParticipant.id); setManageBoxesParticipant(null); }} className="px-4 py-2 bg-red-50 text-red-500 font-black uppercase text-[8px] rounded-lg hover:bg-red-500 hover:text-white transition-all border border-red-100"><i className="fas fa-trash-alt mr-2"></i> Remove All Boxes</button>
                 </div>
                 {!manageBoxesParticipant.squareIds || manageBoxesParticipant.squareIds.length === 0 ? <div className="py-12 text-center text-gray-400 italic text-xs">No boxes assigned.</div> : (
                    manageBoxesParticipant.squareIds.map((sid: number) => {
                      const sq = safeSquares[sid];
                      return (
                        <div key={sid} className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                           <div><p className="text-sm font-black text-indigo-900 uppercase">Box #{sid + 1}</p><div className="flex gap-2 mt-1"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${sq.paidAmount >= settings.costPerBox ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>${sq.paidAmount} Paid</span></div></div>
                           <button onClick={() => onUnassignSquare(sid)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-xs"></i></button>
                        </div>
                      );
                    })
                 )}
              </div>
              <div className="p-6 border-t border-gray-100"><button onClick={() => setManageBoxesParticipant(null)} className="w-full py-4 bg-gray-50 rounded-2xl font-black text-[10px] uppercase text-gray-400 tracking-widest hover:bg-gray-100 transition-all">Close</button></div>
           </div>
        </div>
      )}

      {editModalParticipant && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="bg-indigo-900 p-6 text-white flex justify-between items-center"><h3 className="font-black uppercase text-sm">Edit Participant</h3><button onClick={() => setEditModalParticipant(null)}><i className="fas fa-times"></i></button></div>
            <form onSubmit={handleConfirmEditParticipant} className="p-6 space-y-4">
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Full Name</label><input required onFocus={e => e.target.select()} value={editFormData.name} onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Email</label><input required type="email" onFocus={e => e.target.select()} value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Phone</label><input required type="tel" onFocus={e => e.target.select()} value={editFormData.phone} onChange={e => setEditFormData({ ...editFormData, phone: formatPhoneNumber(e.target.value) })} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-1">Alias</label><input required maxLength={16} onFocus={e => e.target.select()} value={editFormData.alias} onChange={e => setEditFormData({ ...editFormData, alias: e.target.value.toUpperCase() })} className="w-full p-3 bg-indigo-50 border-none rounded-xl font-black text-indigo-900 uppercase text-sm outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl mt-4">Update Profile</button>
            </form>
          </div>
        </div>
      )}

      {paymentModalParticipant && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in slide-in-from-bottom-6 max-h-[90vh] overflow-y-auto">
            <div className={`p-6 text-white flex justify-between items-center sticky top-0 ${editingTransactionId ? 'bg-orange-500' : 'bg-indigo-900'}`}><h3 className="font-black uppercase text-sm">{editingTransactionId ? 'Edit Entry' : 'Add Entry'}</h3><button onClick={() => { setPaymentModalParticipant(null); setEditingTransactionId(null); setPaymentNote(''); }}><i className="fas fa-times"></i></button></div>
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Amount ($)</label><input required autoFocus type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Method</label><div className="grid grid-cols-2 gap-2">{['Cash', 'Venmo', 'PayPal', 'Zelle', 'Other'].map(m => (<button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${paymentMethod === m ? 'bg-indigo-900 border-indigo-900 text-white' : 'bg-white border-gray-100 text-gray-400'}`}>{m}</button>))}</div></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Note (optional)</label><textarea value={paymentNote} onChange={e => setPaymentNote(e.target.value)} placeholder="e.g., 'Cash payment during meeting'" className="w-full p-3 bg-gray-50 rounded-xl font-medium text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-none" rows={3}></textarea></div>
              <div className="flex flex-col gap-3 pt-4"><button type="submit" className={`w-full text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl ${editingTransactionId ? 'bg-orange-500' : 'bg-green-600'}`}>{editingTransactionId ? 'Save Changes' : 'Log Payment'}</button>{editingTransactionId && <button type="button" onClick={handleDeleteTransactionInModal} className="w-full bg-red-50 text-red-500 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-500 hover:text-white transition-all border border-red-100">Delete Entry</button>}</div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;
