
import React, { useState, useEffect, useMemo } from 'react';
import { Participant, GameSettings, Square, Pool } from '../types';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Participant, 'id'>, ids: number[]) => void;
  onUnassign: (id: number) => void;
  onSetPendingSelection: (ids: number[]) => void;
  selectedSquareIds: number[];
  activePool: Pool;
  existingParticipants: (Participant & { originPoolName?: string })[];
  settings: GameSettings;
  isAdmin?: boolean;
}

const EntryModal: React.FC<EntryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onUnassign,
  onSetPendingSelection,
  selectedSquareIds,
  activePool,
  existingParticipants, 
  settings,
  isAdmin = false
}) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationError, setVerificationError] = useState(false);
  const [activeQr, setActiveQr] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alias: '',
  });

  const currentSelection = useMemo(() => {
    return (selectedSquareIds || []).map(id => (activePool.squares || [])[id]).filter(Boolean);
  }, [selectedSquareIds, activePool.squares]);

  const matchedParticipant = useMemo(() => {
    // Match only by alias - allows same email/phone with different alias
    return existingParticipants.find(p => p.alias.toLowerCase() === formData.alias.toLowerCase());
  }, [formData.alias, existingParticipants]);

  const allSquaresInCheckout = useMemo(() => {
    const matchedPId = matchedParticipant?.id;
    if (!matchedPId) return currentSelection;
    const otherUnpaid = (activePool.squares || []).filter(sq => 
      sq.participantId === matchedPId && 
      !(selectedSquareIds || []).includes(sq.id) && 
      (sq.paidAmount || 0) < settings.costPerBox
    );
    return [...currentSelection, ...otherUnpaid];
  }, [matchedParticipant, activePool.squares, selectedSquareIds, currentSelection, settings.costPerBox]);

  const allAssigned = currentSelection.length > 0 && currentSelection.every(s => s.assigned);

  const verifiedPlayerStats = useMemo(() => {
    if ((!isVerified && !isAdmin) || currentSelection.length === 0) return null;
    const firstSq = currentSelection[0];
    const p = existingParticipants.find(p => p.id === firstSq?.participantId);
    if (!p) return null;

    const playerSquares = (activePool.squares || []).filter(s => s.participantId === p.id);
    const totalOwed = playerSquares.length * settings.costPerBox;
    const totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
    const balance = Math.max(0, totalOwed - totalPaid);
    return { balance, totalPaid, boxCount: playerSquares.length, p };
  }, [isVerified, isAdmin, currentSelection, existingParticipants, activePool.squares, settings.costPerBox]);
  
  const totalDue = useMemo(() => {
    return allSquaresInCheckout.length * settings.costPerBox - allSquaresInCheckout.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  }, [allSquaresInCheckout, settings.costPerBox]);

  useEffect(() => {
    if (isOpen) {
      setIsSubmitted(false);
      setIsVerified(false);
      setVerificationEmail('');
      setVerificationError(false);
      setActiveQr(null);
      
      if (currentSelection.length === 1 && currentSelection[0].assigned) {
        const p = existingParticipants.find(p => p.id === currentSelection[0].participantId);
        if (p) {
          setFormData({
            name: p.name,
            email: p.email,
            phone: p.phone,
            alias: p.alias.toUpperCase(),
          });
        }
      } else {
        setFormData({ name: '', email: '', phone: '', alias: '' });
      }
    }
  }, [isOpen, currentSelection, existingParticipants]);

  if (!isOpen || currentSelection.length === 0) return null;

  const handleRemoveSquareFromSelection = (id: number) => {
    const newSelection = (selectedSquareIds || []).filter(sid => sid !== id);
    onSetPendingSelection(newSelection);
    if (newSelection.length === 0) onClose();
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const phoneNumber = e.target.value.replace(/[^\d]/g, '');
    const len = phoneNumber.length;
    let formattedValue = phoneNumber;
    if (len >= 4 && len < 7) formattedValue = `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    else if (len >= 7) formattedValue = `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    setFormData({ ...formData, phone: formattedValue });
  };

  const handleSelectExistingPlayer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const p = existingParticipants.find(part => part.id === pId);
    if (p) setFormData({ name: p.name, email: p.email, phone: p.phone, alias: p.alias.toUpperCase() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate that either email or phone is provided
    if (!formData.email && !formData.phone) {
      return;
    }
    onSubmit({ ...formData, alias: formData.alias.toUpperCase() }, allSquaresInCheckout.map(s => s.id));
    setIsSubmitted(true);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const firstSq = currentSelection[0];
    const participant = existingParticipants.find(p => p.id === firstSq.participantId);
    if (participant && participant.email.toLowerCase() === verificationEmail.toLowerCase()) {
      setIsVerified(true);
      setVerificationError(false);
    } else setVerificationError(true);
  };

  const hasPaymentInfo = settings.zelleAccount || settings.paypalAccount || settings.paypalLink || settings.venmoAccount || settings.otherPaymentInfo;

  const PaymentActions = ({ currentAlias, amount }: { currentAlias: string; amount: number }) => {
    const paypalUrl = settings.paypalLink || (settings.paypalAccount ? `https://www.paypal.com/paypalme/${settings.paypalAccount}/${amount}` : null);
    const venmoUrl = settings.venmoAccount ? `https://venmo.com/${settings.venmoAccount.replace('@', '')}?txn=pay&amount=${amount}&note=${encodeURIComponent(`Squares: ${currentAlias.toUpperCase()}`)}` : null;
    return (
      <div className="space-y-4">
        {paypalUrl && <a href={paypalUrl} target="_blank" className="flex items-center justify-between px-5 py-3 bg-[#003087] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"><span><i className="fab fa-paypal mr-2"></i> PayPal: ${amount}</span></a>}
        {venmoUrl && <a href={venmoUrl} target="_blank" className="flex items-center justify-between px-5 py-3 bg-[#3d95ce] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg"><span><i className="fab fa-vimeo-v mr-2"></i> Venmo: ${amount}</span></a>}
        {settings.zelleAccount && <div className="px-5 py-3 bg-[#6d1ed4] text-white rounded-xl font-black uppercase text-[10px] tracking-widest text-center">Zelle: {settings.zelleAccount}</div>}
        <p className="text-[9px] text-gray-400 italic text-center uppercase font-black">Memo: "{currentAlias.toUpperCase()}"</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-indigo-950/40 backdrop-blur-md">
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-6 duration-300">
        <div className="p-6 md:p-8 bg-indigo-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">{allAssigned ? 'Manage Box' : `Claiming ${currentSelection.length} Boxes`}</h2>
            <p className="text-indigo-300 text-[9px] font-bold uppercase tracking-widest mt-2 uppercase">{isAdmin ? 'ADMIN CONTROL ENABLED' : `Support ${settings.charityName}`}</p>
          </div>
          <button onClick={onClose} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center z-10"><i className="fas fa-times text-xl"></i></button>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {!allAssigned && !isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              {existingParticipants.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block">Quick Select Player</label>
                  <select onChange={handleSelectExistingPlayer} className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">-- New Player --</option>
                    {existingParticipants.sort((a,b) => (a.alias || a.name).localeCompare(b.alias || b.name)).map(p => (
                      <option key={p.id} value={p.id}>{(p.alias || p.name).toString().toUpperCase()} {p.originPoolName ? ` • ${p.originPoolName}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                 <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Items in checkout</p>
                 <div className="flex flex-wrap gap-2">
                    {currentSelection.map(s => (
                        <div key={s.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-indigo-900 font-black text-[10px] rounded-lg shadow-sm border border-indigo-100">
                          <span>#{s.id + 1}</span>
                          <button type="button" onClick={() => handleRemoveSquareFromSelection(s.id)} className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white"><i className="fas fa-times text-[8px]"></i></button>
                        </div>
                    ))}
                 </div>
                 <div className="mt-3 pt-3 border-t border-indigo-100/50 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-indigo-900">Amount Due</span><span className="text-lg font-black text-indigo-900">${totalDue}</span></div>
              </div>
              <input required onFocus={e => e.target.select()} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Full Name" />
              <div className="space-y-3">
                <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Email Address (optional)" />
                <input type="tel" value={formData.phone} onChange={handlePhoneChange} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Cell Number (optional)" maxLength={14} />
                {!formData.email && !formData.phone && <p className="text-red-500 text-[10px] font-bold uppercase">Require either email or phone</p>}
              </div>
              <input required maxLength={16} value={formData.alias} onChange={e => setFormData({ ...formData, alias: e.target.value.toUpperCase() })} className="w-full p-4 bg-indigo-50 rounded-xl font-black text-indigo-900 uppercase text-sm outline-none" placeholder="Alias (Visible on Grid)" />
              <button type="submit" disabled={!formData.name || (!formData.email && !formData.phone) || !formData.alias} className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50">Confirm & Register</button>
            </form>
          ) : isSubmitted ? (
            <div className="text-center space-y-6">
              <i className="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
              <h3 className="font-black text-indigo-900 uppercase text-sm">Successfully Claimed!</h3>
              <p className="text-4xl font-black text-indigo-900">${totalDue}</p>
              {hasPaymentInfo ? <PaymentActions currentAlias={formData.alias} amount={totalDue} /> : <p className="text-xs text-gray-400">Contact admin to pay.</p>}
              <button onClick={onClose} className="text-xs font-black uppercase text-indigo-500">Return to Board</button>
            </div>
          ) : (
            <div className="space-y-6">
              {(isVerified || isAdmin) && verifiedPlayerStats && (
                <div className="bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 text-center animate-in zoom-in-95">
                  <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Balance Due</p>
                  <p className="text-4xl font-black text-indigo-900">${verifiedPlayerStats.balance.toFixed(0)}</p>
                </div>
              )}
              {(!isVerified && !isAdmin) ? (
                <form onSubmit={handleVerify} className="space-y-4">
                  <p className="text-xs text-center font-bold text-gray-500">Enter account email to manage this box.</p>
                  <input required onFocus={e => e.target.select()} type="email" value={verificationEmail} onChange={e => setVerificationEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm outline-none" placeholder="Verify Email" />
                  {verificationError && <p className="text-red-500 text-[10px] font-bold text-center uppercase">Email does not match.</p>}
                  <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Verify Ownership</button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                   {verifiedPlayerStats && <PaymentActions currentAlias={verifiedPlayerStats.p.alias} amount={verifiedPlayerStats.balance} />}
                   <div className="pt-8 border-t border-gray-100 space-y-4">
                      <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">{isAdmin ? 'ADMIN CONTROL: REMOVE CLAIM' : 'RELINQUISH BOX'}</h4>
                      <p className="text-[10px] text-gray-400 font-bold leading-tight px-1 uppercase italic">Removing the name will make this box available for others. Funds will be redistributed to other boxes if applicable.</p>
                      <button 
                        type="button" 
                        onClick={() => onUnassign(currentSelection[0].id)} 
                        className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                      >
                        Remove Name (Relinquish)
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
