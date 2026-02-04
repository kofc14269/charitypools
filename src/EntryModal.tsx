
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
  existingParticipants: Participant[];
  settings: GameSettings;
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
  settings 
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
    const cleanedSearchPhone = formData.phone.replace(/\D/g, '');
    return existingParticipants.find(p => 
      p.email.toLowerCase() === formData.email.toLowerCase() || 
      (cleanedSearchPhone && p.phone.replace(/\D/g, '') === cleanedSearchPhone)
    );
  }, [formData.email, formData.phone, existingParticipants]);

  const isAliasMismatch = useMemo(() => {
    if (!matchedParticipant || !formData.alias) return false;
    return matchedParticipant.alias.toUpperCase() !== formData.alias.toUpperCase();
  }, [matchedParticipant, formData.alias]);

  const otherUnpaidSquares = useMemo(() => {
    if (!matchedParticipant) return [];
    return (activePool.squares || []).filter(sq => 
      sq.participantId === matchedParticipant.id && 
      !(selectedSquareIds || []).includes(sq.id) && 
      (sq.paidAmount || 0) < settings.costPerBox
    );
  }, [matchedParticipant, activePool.squares, selectedSquareIds, settings.costPerBox]);

  const allSquaresInCheckout = useMemo(() => {
    return [...currentSelection, ...otherUnpaidSquares];
  }, [currentSelection, otherUnpaidSquares]);

  const allAssigned = currentSelection.length > 0 && currentSelection.every(s => s.assigned);

  const verifiedPlayerStats = useMemo(() => {
    if (!isVerified || currentSelection.length === 0) return null;
    const firstSq = currentSelection[0];
    const p = existingParticipants.find(p => p.id === firstSq?.participantId);
    if (!p) return null;

    const playerSquares = (activePool.squares || []).filter(s => s.participantId === p.id);
    const totalOwed = playerSquares.length * settings.costPerBox;
    const totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
    const balance = Math.max(0, totalOwed - totalPaid);

    return { balance, totalPaid, boxCount: playerSquares.length, p };
  }, [isVerified, currentSelection, existingParticipants, activePool.squares, settings.costPerBox]);
  
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

  const formatPhoneNumber = (value: string) => {
    if (!value) return value;
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formattedValue });
  };

  const handleSelectExistingPlayer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const p = existingParticipants.find(part => part.id === pId);
    if (p) {
      setFormData({
        name: p.name,
        email: p.email,
        phone: p.phone,
        alias: p.alias.toUpperCase(),
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allIds = allSquaresInCheckout.map(s => s.id);
    onSubmit({ ...formData, alias: formData.alias.toUpperCase() }, allIds);
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

  const generateQrUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}&margin=10`;

  const hasPaymentInfo = settings.zelleAccount || settings.paypalAccount || settings.paypalLink || settings.venmoAccount || settings.otherPaymentInfo;

  const PaymentActions = ({ currentAlias, amount }: { currentAlias: string; amount: number }) => {
    const paypalUrl = settings.paypalLink || (settings.paypalAccount ? `https://www.paypal.com/paypalme/${settings.paypalAccount}/${amount}` : null);
    const venmoUrl = settings.venmoAccount ? `https://venmo.com/${settings.venmoAccount.replace('@', '')}?txn=pay&amount=${amount}&note=${encodeURIComponent(`Squares: ${currentAlias.toUpperCase()}`)}` : null;
    const zelleInfo = settings.zelleAccount || "";

    return (
      <div className="space-y-4">
        {paypalUrl && (
          <div className="flex flex-col gap-2">
            <a href={paypalUrl} target="_blank" className="flex items-center justify-between gap-3 px-5 py-3 bg-[#003087] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              <span className="flex items-center gap-2"><i className="fab fa-paypal"></i> PayPal: ${amount}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveQr(activeQr === 'paypal' ? null : 'paypal'); }} className="bg-white/20 px-2 py-1 rounded text-[8px] hover:bg-white/30 transition-colors">Scan QR</button>
            </a>
            {activeQr === 'paypal' && (
              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(paypalUrl)} alt="PayPal QR" className="w-32 h-32" />
                <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Scan with Camera to Pay</p>
              </div>
            )}
          </div>
        )}

        {venmoUrl && (
          <div className="flex flex-col gap-2">
            <a href={venmoUrl} target="_blank" className="flex items-center justify-between gap-3 px-5 py-3 bg-[#3d95ce] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              <span className="flex items-center gap-2"><i className="fab fa-vimeo-v"></i> Venmo: ${amount}</span>
              <button type="button" onClick={(e) => { e.preventDefault(); setActiveQr(activeQr === 'venmo' ? null : 'venmo'); }} className="bg-white/20 px-2 py-1 rounded text-[8px] hover:bg-white/30 transition-colors">Scan QR</button>
            </a>
            {activeQr === 'venmo' && (
              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(venmoUrl)} alt="Venmo QR" className="w-32 h-32" />
                <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Scan with Camera to Pay</p>
              </div>
            )}
          </div>
        )}

        {zelleInfo && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[#6d1ed4] text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">
              <button onClick={() => { navigator.clipboard.writeText(zelleInfo); alert("Zelle info copied!"); }} className="flex items-center gap-1 text-left">
                <i className="fas fa-university"></i> Zelle: {zelleInfo} (${amount})
              </button>
              <button type="button" onClick={() => setActiveQr(activeQr === 'zelle' ? null : 'zelle')} className="bg-white/20 px-2 py-1 rounded text-[8px] hover:bg-white/30 transition-colors">QR Code</button>
            </div>
            {activeQr === 'zelle' && (
              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(zelleInfo)} alt="Zelle QR" className="w-32 h-32" />
                <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Scan to Copy Info</p>
              </div>
            )}
          </div>
        )}

        {settings.otherPaymentInfo && (
          <div className="flex flex-col gap-2">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-center relative">
              <p className="text-[9px] font-black text-orange-600 uppercase mb-1">Other Instructions</p>
              <p className="text-xs font-bold text-gray-700">{settings.otherPaymentInfo}</p>
              <button onClick={() => setActiveQr(activeQr === 'other' ? null : 'other')} className="absolute top-2 right-2 text-orange-300 hover:text-orange-500"><i className="fas fa-qrcode text-xs"></i></button>
            </div>
            {activeQr === 'other' && (
              <div className="bg-white p-4 rounded-2xl border-2 border-indigo-100 flex flex-col items-center animate-in zoom-in-95 duration-200">
                <img src={generateQrUrl(settings.otherPaymentInfo)} alt="Other QR" className="w-32 h-32" />
                <p className="text-[8px] font-black uppercase text-gray-400 mt-2">Scan Instruction Data</p>
              </div>
            )}
          </div>
        )}
        <p className="text-[9px] text-gray-400 italic text-center uppercase font-black">Memo: "{currentAlias.toUpperCase()}"</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-indigo-950/40 backdrop-blur-md">
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-6 duration-300">
        
        <div className="p-6 md:p-8 bg-indigo-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-none">
                {allAssigned ? 'Manage Box' : `Claiming ${currentSelection.length} Boxes`}
            </h2>
            <p className="text-indigo-300 text-[9px] font-bold uppercase tracking-widest mt-2">
                {allAssigned ? 'Account Details' : `Support ${settings.charityName}`}
            </p>
          </div>
          <button onClick={onClose} className="bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-all z-10"><i className="fas fa-times text-xl"></i></button>
        </div>

        <div className="p-6 md:p-8 space-y-6 max-h-[80vh] overflow-y-auto scrollbar-hide">
          {!allAssigned && !isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {existingParticipants.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="text-[9px] font-black uppercase text-indigo-400 mb-1 block">Quick Select Player</label>
                  <select 
                    onChange={handleSelectExistingPlayer}
                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- New Player --</option>
                    {existingParticipants.sort((a,b) => a.alias.localeCompare(b.alias)).map(p => (
                      <option key={p.id} value={p.id}>{p.alias.toUpperCase()} ({p.name})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Items in checkout</p>
                 <div className="flex flex-wrap gap-2">
                    {currentSelection.map(s => (
                        <div key={s.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-indigo-900 font-black text-[10px] rounded-lg shadow-sm border border-indigo-100 group">
                          <span>#{s.id + 1}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveSquareFromSelection(s.id)}
                            className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <i className="fas fa-times text-[8px]"></i>
                          </button>
                        </div>
                    ))}
                 </div>
                 <div className="mt-3 pt-3 border-t border-indigo-100/50 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-indigo-900">Amount Due</span>
                    <span className="text-lg font-black text-indigo-900">${totalDue}</span>
                 </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1">Full Name</label>
                <input required onFocus={e => e.target.select()} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1">Email Address</label>
                <input required onFocus={e => e.target.select()} type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-sm" placeholder="email@example.com" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1">Cell Number</label>
                <input required onFocus={e => e.target.select()} type="tel" value={formData.phone} onChange={handlePhoneChange} className="w-full p-4 bg-gray-50 border-none rounded-xl font-bold text-sm" placeholder="(123) 456-7890" maxLength={14} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-gray-400 mb-1 block ml-1">Alias (Visible on Grid - Max 16 Letters)</label>
                <input required onFocus={e => e.target.select()} maxLength={16} value={formData.alias} onChange={e => setFormData({ ...formData, alias: e.target.value.toUpperCase() })} className="w-full p-4 bg-indigo-50 border-none rounded-xl font-black text-indigo-900 uppercase text-sm" placeholder="e.g. CHAMP_25" />
              </div>

              {matchedParticipant && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-in fade-in duration-300">
                  <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Returning Player Detected</p>
                  <p className="text-[11px] text-blue-900 font-bold leading-tight">
                    Welcome back! We found an account for <span className="underline">{matchedParticipant.name}</span>. 
                    {isAliasMismatch && (
                      <span className="block mt-1 text-red-500 font-black">WARNING: This will change your Alias from "{matchedParticipant.alias}" to "{formData.alias}".</span>
                    )}
                  </p>
                </div>
              )}

              <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl">Confirm & Register</button>
            </form>
          ) : isSubmitted ? (
            <div className="text-center space-y-6">
              <div className="bg-green-50 p-6 rounded-3xl border-2 border-green-100">
                <i className="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
                <h3 className="font-black text-indigo-900 uppercase text-sm">Successfully Claimed!</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">Please finish the process by paying below.</p>
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-black text-indigo-900">${totalDue}</p>
                <p className="text-[9px] font-black uppercase text-indigo-300 tracking-widest">Total Donation Amount</p>
              </div>
              {hasPaymentInfo ? <PaymentActions currentAlias={formData.alias} amount={totalDue} /> : <p className="text-xs text-gray-400 italic">Contact admin for payment info.</p>}
              <button onClick={onClose} className="text-xs font-black uppercase text-indigo-500 py-2">Return to Board</button>
            </div>
          ) : (
            <div className="space-y-6">
              {isVerified && verifiedPlayerStats && (
                <div className="bg-orange-50 p-6 rounded-3xl border-2 border-orange-200 text-center animate-in zoom-in-95">
                  <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Total Account Balance</p>
                  <p className="text-4xl font-black text-indigo-900">${verifiedPlayerStats.balance.toFixed(2)}</p>
                  <p className="text-[8px] font-bold text-indigo-400 uppercase mt-2">
                    {verifiedPlayerStats.boxCount} Total Squares / ${verifiedPlayerStats.totalPaid} Contributed
                  </p>
                </div>
              )}

              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                 <div className="flex justify-between items-center mb-4">
                    <p className="text-[9px] font-black uppercase text-gray-400">Account Alias</p>
                    <p className="font-black text-indigo-900 text-sm">{currentSelection[0].alias.toUpperCase()}</p>
                 </div>
                 <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase text-gray-400">Current Box Status</p>
                    <div className="flex flex-wrap gap-2">
                        {currentSelection.map(s => (
                            <div key={s.id} className="flex-1 min-w-[120px] bg-white p-3 rounded-xl border border-indigo-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-400">Box #{s.id+1}</span>
                                <span className={`text-[10px] font-black ${s.paidAmount >= settings.costPerBox ? 'text-green-600' : 'text-orange-600'}`}>${s.paidAmount} Paid</span>
                            </div>
                        ))}
                    </div>
                 </div>
              </div>

              {!isVerified ? (
                <form onSubmit={handleVerify} className="space-y-4">
                  <p className="text-xs text-center font-bold text-gray-500">Enter your email to verify ownership & manage this box.</p>
                  <input required onFocus={e => e.target.select()} type="email" value={verificationEmail} onChange={e => setVerificationEmail(e.target.value)} className="w-full p-4 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Confirm Account Email" />
                  {verificationError && <p className="text-red-500 text-[10px] font-bold text-center uppercase">Email does not match this reservation.</p>}
                  <button type="submit" className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Verify Ownership</button>
                </form>
              ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-green-500 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Option 1: Pay My Balance</h4>
                      </div>
                      <PaymentActions currentAlias={currentSelection[0].alias} amount={verifiedPlayerStats?.balance || 0} />
                   </div>
                   
                   <div className="pt-8 border-t border-gray-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-1 bg-red-500 rounded-full"></div>
                        <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Option 2: Remove My Name</h4>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase leading-tight px-1">
                        Choosing this will relinquish your claim to Box #{currentSelection[0].id + 1}. If you have already paid for this box, your funds will be moved to settle any of your other unpaid boxes.
                      </p>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const targetSquare = currentSelection[0];
                          if (targetSquare) onUnassign(targetSquare.id);
                        }} 
                        className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-red-500 hover:text-white transition-all border border-red-100 shadow-sm"
                      >
                        Remove Name (Relinquish Box)
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
