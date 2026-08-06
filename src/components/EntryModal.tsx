
import React, { useState, useEffect, useMemo } from 'react';
import { Participant, GameSettings, Square, Pool, ThirteenRunData } from '../types';

interface EntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Participant, 'id'>, ids: number[]) => void;
  onUnassign: (id: number) => void;
  onSetPendingSelection: (ids: number[]) => void;
  selectedSquareIds: number[];
  selectedTeamId?: string | null;
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
  selectedTeamId,
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    alias: '',
  });

  const isTeamEntry = activePool.type === '13run' && !!selectedTeamId;

  const normalizeAlias = (alias?: string) => (alias || '').trim().toLowerCase();
  const matchesParticipant = (sq: Square, participant: Participant) => {
    const participantAlias = normalizeAlias(participant.alias);
    const squareAlias = normalizeAlias(sq.alias);
    if (participantAlias && squareAlias) {
      return squareAlias === participantAlias;
    }
    return sq.participantId === participant.id;
  };

  const currentSelection = useMemo(() => {
    if (isTeamEntry) return [];
    return (selectedSquareIds || []).map(id => (activePool.squares || [])[id]).filter(Boolean);
  }, [selectedSquareIds, activePool.squares, isTeamEntry]);

  const selectedTeam = useMemo(() => {
    if (!isTeamEntry || !selectedTeamId) return null;
    const entries = (activePool.gameData as ThirteenRunData)?.entries || {};
    return entries[selectedTeamId];
  }, [isTeamEntry, selectedTeamId, activePool.gameData]);

  const matchedParticipant = useMemo(() => {
    // Match only by alias - allows same email/phone with different alias
    return existingParticipants.find(p => p.alias.toLowerCase() === formData.alias.toLowerCase());
  }, [formData.alias, existingParticipants]);

  const allSquaresInCheckout = useMemo(() => {
    if (isTeamEntry) return [];
    const matchedPId = matchedParticipant?.id;
    if (!matchedPId) return currentSelection;
    const otherUnpaid = (activePool.squares || []).filter(sq =>
      matchesParticipant(sq, matchedParticipant) &&
      !(selectedSquareIds || []).includes(sq.id) &&
      (sq.paidAmount || 0) < settings.costPerBox
    );
    return [...currentSelection, ...otherUnpaid];
  }, [matchedParticipant, activePool.squares, selectedSquareIds, currentSelection, settings.costPerBox, isTeamEntry]);

  const allAssigned = isTeamEntry ? !!selectedTeam?.participantId : (currentSelection.length > 0 && currentSelection.every(s => s.assigned));

  const verifiedPlayerStats = useMemo(() => {
    if ((!isVerified && !isAdmin)) return null;

    let participantId: string | null = null;
    if (isTeamEntry) {
      participantId = selectedTeam?.participantId || null;
    } else if (currentSelection.length > 0) {
      participantId = currentSelection[0].participantId;
    }

    if (!participantId) return null;
    const p = existingParticipants.find(p => p.id === participantId);
    if (!p) return null;

    let boxCount = 0;
    let totalOwed = 0;
    let totalPaid = 0;

    if (activePool.type === '13run') {
      const entries = (activePool.gameData as ThirteenRunData)?.entries || {};
      const playerEntries = Object.values(entries).filter(e => e.participantId === p.id);
      boxCount = playerEntries.length;
      totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
    } else {
      const playerSquares = (activePool.squares || []).filter(s => matchesParticipant(s, p));
      boxCount = playerSquares.length;
      totalPaid = playerSquares.reduce((sum, sq) => sum + (sq.paidAmount || 0), 0);
    }

    totalOwed = boxCount * settings.costPerBox;
    const balance = Math.max(0, totalOwed - totalPaid);
    return { balance, totalPaid, boxCount, p };
  }, [isVerified, isAdmin, currentSelection, existingParticipants, activePool.squares, activePool.gameData, activePool.type, settings.costPerBox, isTeamEntry, selectedTeam]);

  const totalDue = useMemo(() => {
    if (isTeamEntry) return settings.costPerBox;
    return allSquaresInCheckout.length * settings.costPerBox - allSquaresInCheckout.reduce((acc, s) => acc + (s.paidAmount || 0), 0);
  }, [allSquaresInCheckout, settings.costPerBox, isTeamEntry]);

  const canRelinquish = !activePool.settings?.isLocked || isAdmin;

  useEffect(() => {
    if (!isOpen) return;

    setIsSubmitted(false);
    setIsVerified(false);
    setVerificationEmail('');
    setVerificationError(false);
    setActiveQr(null);
    setSelectedPaymentMethod(null);

    if (allAssigned) {
      let participantId: string | null = null;
      if (isTeamEntry) {
        participantId = selectedTeam?.participantId || null;
      } else if (currentSelection.length === 1) {
        participantId = currentSelection[0].participantId;
      }

      if (participantId) {
        const p = existingParticipants.find(p => p.id === participantId);
        if (p) {
          setFormData({
            name: p.name,
            email: p.email,
            phone: p.phone,
            alias: p.alias.toUpperCase(),
          });
        }
      }
    } else {
      setFormData({ name: '', email: '', phone: '', alias: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isSubmitted) return;

    if (allAssigned) {
      let participantId: string | null = null;
      if (isTeamEntry) {
        participantId = selectedTeam?.participantId || null;
      } else if (currentSelection.length === 1) {
        participantId = currentSelection[0].participantId;
      }

      if (participantId) {
        const p = existingParticipants.find(p => p.id === participantId);
        if (p) {
          setFormData({
            name: p.name,
            email: p.email,
            phone: p.phone,
            alias: p.alias.toUpperCase(),
          });
        }
      }
    } else {
      setFormData({ name: '', email: '', phone: '', alias: '' });
    }
  }, [isOpen, isSubmitted, allAssigned, currentSelection, existingParticipants, isTeamEntry, selectedTeam]);

  if (!isOpen || (!isTeamEntry && currentSelection.length === 0)) return null;

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
    setFormData(prev => ({ ...prev, phone: formattedValue }));
  };

  const handleSelectExistingPlayer = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    if (!pId) return;
    const p = existingParticipants.find(part => part.id === pId);
    if (p) setFormData(prev => ({ ...prev, name: p.name, email: p.email, phone: p.phone, alias: p.alias.toUpperCase() }));
  };

  const submitEntry = () => {
    const email = formData.email.trim().toLowerCase();
    const phone = formData.phone.trim();
    const alias = formData.alias.trim().toUpperCase();

    if (!formData.name.trim() || (!email && !phone) || !alias) {
      return;
    }

    const normalizedData = {
      ...formData,
      email,
      phone,
      alias,
    };

    onSubmit(normalizedData, allSquaresInCheckout.map(s => s.id));
    setIsSubmitted(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitEntry();
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    let participantId: string | null = null;
    if (isTeamEntry) {
      participantId = selectedTeam?.participantId || null;
    } else {
      participantId = currentSelection[0]?.participantId;
    }

    if (!participantId) return;
    const participant = existingParticipants.find(p => p.id === participantId);
    if (participant && participant.email.toLowerCase() === verificationEmail.toLowerCase()) {
      setIsVerified(true);
      setVerificationError(false);
    } else setVerificationError(true);
  };

  const zelleEmail = 'kofc14269@gmail.com';

  const buildPaypalUrl = (amount: number) => {
    const link = (settings.paypalLink || settings.paypalAccount || '').trim();
    if (!link) return null;

    // Support explicit {amount} placeholder
    if (link.includes('{amount}')) {
      return link.replace(/\{amount\}/g, amount.toString());
    }

    // Email address → PayPal invoice-style payment link with pre-filled amount
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link);
    if (isEmail) {
      return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(link)}&amount=${amount}&currency_code=USD`;
    }

    try {
      const normalized = link.startsWith('http') ? link : `https://${link}`;
      const parsed = new URL(normalized);
      const hostname = parsed.hostname.toLowerCase();
      const pathname = parsed.pathname.replace(/\/+$/g, '');

      // paypal.me or paypal.com/paypalme — replace/append the amount path segment
      if (hostname.endsWith('paypal.me') || pathname.startsWith('/paypalme')) {
        const segments = pathname.split('/').filter(Boolean);
        // Keep only non-numeric leading segments (username), drop any stale amount
        const baseSegments = segments.filter((s, i) => i === 0 || (i === 1 && isNaN(Number(s))));
        return `${parsed.origin}/${baseSegments.join('/')}/${amount}`;
      }

      // Any other paypal.com URL — append amount as a query param if not already present
      if (hostname.endsWith('paypal.com')) {
        const params = new URLSearchParams(parsed.search);
        if (!params.has('amount')) params.set('amount', String(amount));
        return `${parsed.origin}${parsed.pathname}?${params.toString()}`;
      }
    } catch {
      // Fall through to username handling below
    }

    // Bare username — build a canonical paypal.me URL with amount
    return `https://paypal.me/${link}/${amount}`;
  };

  const PaymentActions = ({ currentAlias, amount }: { currentAlias: string; amount: number }) => {
    const memoText = `${isTeamEntry ? '13-Run' : 'Squares'}: ${currentAlias.toUpperCase()}`;

    const handlePaymentSelection = (method: string) => {
      setSelectedPaymentMethod(method);
      if (method === 'Pay Later') {
        submitEntry();
      }
    };

    const renderPaymentDetails = () => {
      if (!selectedPaymentMethod) {
        return (
          <div className="px-5 py-4 rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-600">
            Select a payment option to see the next steps.
          </div>
        );
      }

      const paypalUrl = buildPaypalUrl(amount);
      switch (selectedPaymentMethod) {
        case 'Zelle':
          return (
            <div className="space-y-3 px-5 py-4 rounded-3xl border border-gray-200 bg-white text-sm text-gray-700">
              <div className="font-black uppercase text-[10px] tracking-widest text-indigo-900">Zelle Payment</div>
              <p>Send ${amount} via Zelle to:</p>
              <div className="rounded-2xl bg-indigo-900 text-white px-4 py-3 font-black uppercase tracking-[0.2em] text-[10px]">{zelleEmail}</div>
              <p>Include your alias in the memo:</p>
              <div className="rounded-2xl bg-gray-100 text-gray-900 px-4 py-3 font-black uppercase tracking-[0.2em] text-[10px]">{memoText}</div>
            </div>
          );
        case 'PayPal':
          return paypalUrl ? (
            <div className="space-y-3 px-5 py-4 rounded-3xl border border-gray-200 bg-white text-sm text-gray-700">
              <div className="font-black uppercase text-[10px] tracking-widest text-[#003087]">PayPal Payment</div>
              <p>Tap below to send ${amount} via PayPal. Include your alias in the memo.</p>
              <div className="rounded-2xl bg-gray-100 text-gray-900 px-4 py-3 font-black uppercase tracking-[0.2em] text-[10px]">{memoText}</div>
              <a
                href={paypalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#003087] text-white font-black uppercase text-[11px] tracking-widest hover:brightness-110 transition-all"
              >
                <i className="fab fa-paypal" /> Open PayPal
              </a>
            </div>
          ) : null;
        case 'Pay Later':
          return (
            <div className="space-y-3 px-5 py-4 rounded-3xl border border-dashed border-indigo-200 bg-indigo-50 text-sm text-indigo-900">
              <div className="font-black uppercase text-[10px] tracking-widest">Pay Later</div>
              <p>Your boxes are reserved now and you can pay later.</p>
              <p className="font-black uppercase text-[10px] tracking-widest text-gray-500">Please settle ${amount} with admin before the game starts.</p>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="space-y-4">
        <div className="rounded-3xl bg-indigo-50 p-5 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-600">Payment Portal</div>
          <div className="text-3xl font-black text-indigo-900 mt-3">${amount}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-2">Use one of the payment options below</div>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => handlePaymentSelection('Zelle')}
            className={`w-full px-5 py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest transition ${selectedPaymentMethod === 'Zelle' ? 'bg-white text-[#6d1ed4] border border-[#6d1ed4]' : 'bg-[#6d1ed4] text-white'}`}
          >
            Zelle
          </button>
          {buildPaypalUrl(amount) && (
            <button
              type="button"
              onClick={() => handlePaymentSelection('PayPal')}
              className={`w-full px-5 py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest transition ${selectedPaymentMethod === 'PayPal' ? 'bg-white text-[#003087] border border-[#003087]' : 'bg-[#003087] text-white'}`}
            >
              <i className="fab fa-paypal mr-2" />PayPal
            </button>
          )}
          <button
            type="button"
            onClick={() => handlePaymentSelection('Pay Later')}
            className={`w-full px-5 py-4 rounded-3xl font-black uppercase text-[11px] tracking-widest transition ${selectedPaymentMethod === 'Pay Later' ? 'bg-indigo-900 text-white border border-indigo-900' : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'}`}
          >
            Pay Later
          </button>
        </div>

        <div className="space-y-3">
          {renderPaymentDetails()}
          <div className="text-[9px] text-gray-500 italic uppercase tracking-[0.3em] text-center">Always include your alias in the memo: {currentAlias.toUpperCase()}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-indigo-950/40 backdrop-blur-md">
      <div className="bg-white rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-6 duration-300">
        <div className="p-6 md:p-8 bg-indigo-900 text-white flex justify-between items-center relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">
              {allAssigned ? 'Manage Entry' : (isTeamEntry ? `Claiming ${selectedTeam?.teamName}` : `Claiming ${currentSelection.length} Boxes`)}
            </h2>
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
                    {existingParticipants.sort((a, b) => (a.alias || a.name).localeCompare(b.alias || b.name)).map(p => (
                      <option key={p.id} value={p.id}>{(p.alias || p.name).toString().toUpperCase()} {p.originPoolName ? ` • ${p.originPoolName}` : ''}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Items in checkout</p>
                <div className="flex flex-wrap gap-2">
                  {allSquaresInCheckout.map(s => (
                    <div key={s.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-indigo-900 font-black text-[10px] rounded-lg shadow-sm border border-indigo-100">
                      <span>#{s.id + 1}</span>
                      <button type="button" onClick={() => handleRemoveSquareFromSelection(s.id)} className="w-4 h-4 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white"><i className="fas fa-times text-[8px]"></i></button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-100/50 flex justify-between items-center"><span className="text-[10px] font-black uppercase text-indigo-900">Amount Due</span><span className="text-lg font-black text-indigo-900">${totalDue}</span></div>
              </div>
              <input required onFocus={e => e.target.select()} value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Full Name" />
              <div className="space-y-3">
                <input type="email" value={formData.email} onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Email Address (optional)" />
                <input type="tel" value={formData.phone} onChange={handlePhoneChange} className="w-full p-4 bg-gray-50 rounded-xl font-bold text-sm outline-none" placeholder="Cell Number (optional)" maxLength={14} />
                {(!formData.email.trim() && !formData.phone.trim()) && <p className="text-red-500 text-[10px] font-bold uppercase">Require either email or phone</p>}
              </div>
              <input required maxLength={16} value={formData.alias} onChange={e => setFormData(prev => ({ ...prev, alias: e.target.value.toUpperCase() }))} className="w-full p-4 bg-indigo-50 rounded-xl font-black text-indigo-900 uppercase text-sm outline-none" placeholder="Alias (Visible on Grid)" />
              <button type="submit" disabled={!formData.name.trim() || (!formData.email.trim() && !formData.phone.trim()) || !formData.alias.trim()} className="w-full bg-indigo-900 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-xl disabled:opacity-50">Confirm & Register</button>
            </form>
          ) : isSubmitted ? (
            <div className="text-center space-y-6">
              <i className="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
              <h3 className="font-black text-indigo-900 uppercase text-sm">Successfully Claimed!</h3>
              <p className="text-4xl font-black text-indigo-900">${totalDue}</p>
              <PaymentActions currentAlias={formData.alias} amount={totalDue} />
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
                    {!canRelinquish ? (
                      <div className="w-full bg-yellow-50 text-yellow-900 border border-yellow-200 p-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest">
                        Boxes are confirmed. Only an admin can relinquish ownership.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onUnassign(currentSelection[0].id)}
                        className="w-full bg-red-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl hover:bg-black transition-all active:scale-95"
                      >
                        Remove Name (Relinquish)
                      </button>
                    )}
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
