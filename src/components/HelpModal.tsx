
import React from 'react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="bg-indigo-600 p-8 text-white flex justify-between items-center relative overflow-hidden flex-shrink-0">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <i className="fas fa-question-circle text-8xl rotate-12"></i>
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black uppercase tracking-tight">How it Works</h2>
            <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Platform Guide & Documentation</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 w-12 h-12 rounded-full flex items-center justify-center transition-all z-10">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8 md:p-10 overflow-y-auto space-y-10 scrollbar-hide">
          {/* Getting Started Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-rocket text-sm"></i>
              </div>
              <h3 className="text-lg font-black text-indigo-900 uppercase">Getting Started</h3>
            </div>
            <div className="space-y-3">
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Welcome to the Board</p>
                <p className="text-xs text-gray-600 font-medium">
                  Click the <span className="font-bold">logo in the header</span> to jump to the Board. Use the <span className="font-bold">Pool Selector</span> to switch between contests. This app supports multiple simultaneous pools.
                </p>
              </div>
              <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Navigation Tabs</p>
                <ul className="text-xs text-gray-600 space-y-2">
                  <li className="flex gap-2"><i className="fas fa-th text-indigo-400 mt-0.5"></i> <span><strong>Board:</strong> View and claim squares</span></li>
                  <li className="flex gap-2"><i className="fas fa-trophy text-indigo-400 mt-0.5"></i> <span><strong>Winners:</strong> Live score tracking and payouts</span></li>
                  <li className="flex gap-2"><i className="fas fa-user-check text-indigo-400 mt-0.5"></i> <span><strong>My Boxes:</strong> Check your status and balance</span></li>
                  <li className="flex gap-2"><i className="fas fa-lock text-indigo-400 mt-0.5"></i> <span><strong>Admin:</strong> Management tools (password protected)</span></li>
                </ul>
              </div>
            </div>
          </section>

          {/* Player Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-user text-sm"></i>
              </div>
              <h3 className="text-lg font-black text-indigo-900 uppercase">For Contest Players</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Claiming Squares</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Click any white square on the board to select it (they'll highlight in blue). Select as many as you want, then press <span className="text-indigo-600 font-bold">Claim Selected</span> to register with your name, email, and alias.
                </p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Making Payments</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  After registering, use the payment buttons in <span className="text-indigo-600 font-bold">My Boxes</span> to send funds via Venmo, PayPal, or Zelle. Always include your <span className="text-indigo-600 font-bold">Alias</span> in the memo.
                </p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Checking Your Status</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Go to <span className="text-indigo-600 font-bold">My Boxes</span>, enter your email, and see your claimed squares, payment history, and current balance at a glance.
                </p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Winning & Payouts</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  The <span className="text-indigo-600 font-bold">Winners</span> tab shows live scores and calculates payouts in real-time. Winners are determined by matching the last digit of each team's score to the grid coordinates.
                </p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Sharing the Contest</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Click the <span className="text-indigo-600 font-bold">Copy Link</span> button in the header to get a unique shareable link for this contest. Recipients can see the board and join without needing special access.
                </p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-2">Get Help</p>
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                  Click the <span className="text-indigo-600 font-bold">?</span> icon in the header anytime to revisit this guide.
                </p>
              </div>
            </div>
          </section>

          {/* Admin Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-lock text-sm"></i>
              </div>
              <h3 className="text-lg font-black text-indigo-900 uppercase">For Administrators</h3>
            </div>
            <div className="space-y-3">
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Pool & Grid Settings</p>
                <p className="text-xs text-gray-600 font-medium">
                  Create new pools, set team names, configure the cost per box, and manage grid locks. Use <span className="font-bold">Generate Numbers</span> to randomly populate the X and Y axis numbers for winner calculations.
                </p>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Financial Configuration</p>
                <p className="text-xs text-gray-600 font-medium">
                  Set the <span className="font-bold">Charity Share</span> as a fixed amount or percentage. Configure payment accounts (Venmo, PayPal, Zelle, or custom). Track and record all participant payments.
                </p>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Payout Modes</p>
                <ul className="text-xs text-gray-600 space-y-2 mt-2">
                  <li className="flex gap-2"><i className="fas fa-check text-indigo-400 mt-1"></i> <span><strong>Standard:</strong> Split payouts across Q1, Halftime, Q3, and Final.</span></li>
                  <li className="flex gap-2"><i className="fas fa-check text-indigo-400 mt-1"></i> <span><strong>Score Change:</strong> Award a multiplier payout each time the score changes.</span></li>
                </ul>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Live Scoring & Winners</p>
                <p className="text-xs text-gray-600 font-medium">
                  Enter scores in the <span className="font-bold">Admin Panel → Winners</span> tab. The system instantly calculates winners by matching score last digits to grid coordinates and applies payouts based on your configuration.
                </p>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Participant & Payment Management</p>
                <p className="text-xs text-gray-600 font-medium">
                  Manage all participants, edit aliases, log manual payments, and redistribute funds. Unassign squares to reclaim them, and use <span className="font-bold">Clear All Boxes</span> for bulk resets.
                </p>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Export & Data Management</p>
                <p className="text-xs text-gray-600 font-medium">
                  Export the full grid as CSV (with player names and contact info), payment audit logs, or the entire pool state as JSON. Import previously exported states to restore or clone contests.
                </p>
              </div>
              <div className="p-5 border-l-4 border-indigo-600 bg-indigo-50/50 rounded-r-2xl">
                <p className="text-[10px] font-black text-indigo-900 uppercase mb-1">Multi-Pool Support</p>
                <p className="text-xs text-gray-600 font-medium">
                  Run multiple contests in a single app instance. Create new pools, switch between them using the dropdown, and manage each independently with separate grids, participants, and payouts.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all"
          >
            Got it, Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
