import React, { useState, useCallback, useEffect } from 'react';
import { 
  PlusCircle, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Send, 
  History, 
  ClipboardCheck, 
  Zap, 
  Smartphone,
  Clock,
  User,
  LayoutDashboard,
  AlertCircle,
  FileText,
  Sparkles,
  Edit3,
  Wifi,
  WifiOff
} from 'lucide-react';
import { ShiftType, SiteFault, PlannedWork, ShiftSummary } from './types';
import { getCurrentShift, Card } from './constants';
import { generateAISummary } from './geminiService';
import { 
  getShiftId, 
  syncShiftData, 
  syncFaults, 
  syncPlanned, 
  dbAddFault, 
  dbUpdateFault, 
  dbDeleteFault, 
  dbAddPlanned, 
  dbDeletePlanned, 
  dbUpdateShiftInfo 
} from './firebaseService';

const App: React.FC = () => {
  // --- Basic Config ---
  const today = new Date().toLocaleDateString('he-IL');
  const currentShiftType = getCurrentShift() as ShiftType;
  const shiftId = getShiftId(today, currentShiftType);

  // --- State ---
  const [shiftInfo, setShiftInfo] = useState<ShiftSummary>({
    controllers: ['', ''],
    shiftType: currentShiftType,
    date: today,
    generalNotes: ''
  });
  const [faults, setFaults] = useState<SiteFault[]>([]);
  const [plannedWorks, setPlannedWorks] = useState<PlannedWork[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  // --- New Fault Temp State ---
  const [newFault, setNewFault] = useState<Partial<SiteFault>>({
    isPowerIssue: false,
    status: 'open',
    siteNumber: '',
    siteName: '',
    reason: '',
    downtime: '',
    batteryBackupTime: ''
  });
  const [newPlannedWork, setNewPlannedWork] = useState('');

  // --- Real-time Sync Listeners ---
  useEffect(() => {
    // Sync Shift Info
    const unsubShift = syncShiftData(shiftId, (data) => {
      setShiftInfo(prev => ({ ...prev, ...data }));
    });
    
    // Sync Faults
    const unsubFaults = syncFaults(shiftId, (data) => {
      setFaults(data as SiteFault[]);
      setIsConnected(true);
    });

    // Sync Planned Works
    const unsubPlanned = syncPlanned(shiftId, (data) => {
      setPlannedWorks(data as PlannedWork[]);
    });

    return () => {
      unsubShift();
      unsubFaults();
      unsubPlanned();
    };
  }, [shiftId]);

  // --- Handlers (Now pushing to DB instead of local state) ---
  const addFault = async () => {
    if (!newFault.siteNumber || !newFault.siteName) {
      alert("נא להזין מספר אתר ושם אתר");
      return;
    }
    
    const fault = {
      siteNumber: newFault.siteNumber,
      siteName: newFault.siteName,
      reason: newFault.reason || '',
      isPowerIssue: newFault.isPowerIssue || false,
      batteryBackupTime: newFault.batteryBackupTime || '',
      treatment: '',
      downtime: newFault.downtime || '',
      status: 'open',
      createdAt: Date.now()
    };

    await dbAddFault(shiftId, fault);
    setNewFault({ isPowerIssue: false, status: 'open', siteNumber: '', siteName: '', reason: '', downtime: '', batteryBackupTime: '' });
  };

  const updateFaultTreatment = (id: string, treatment: string) => {
    dbUpdateFault(id, { treatment });
  };

  const toggleFaultStatus = (id: string, currentStatus: string) => {
    dbUpdateFault(id, { status: currentStatus === 'open' ? 'closed' : 'open' });
  };

  const deleteFault = (id: string) => {
    if (confirm("מחיקת תקלה מהמסד המשותף?")) {
      dbDeleteFault(id);
    }
  };

  const updateShiftNotes = (notes: string) => {
    setShiftInfo(prev => ({ ...prev, generalNotes: notes }));
    dbUpdateShiftInfo(shiftId, { generalNotes: notes });
  };

  const updateControllers = (idx: number, name: string) => {
    const newControllers = [...shiftInfo.controllers];
    newControllers[idx] = name;
    setShiftInfo(prev => ({ ...prev, controllers: newControllers as [string, string] }));
    dbUpdateShiftInfo(shiftId, { controllers: newControllers });
  };

  const addPlannedWork = async () => {
    if (!newPlannedWork.trim()) return;
    await dbAddPlanned(shiftId, { description: newPlannedWork });
    setNewPlannedWork('');
  };

  const removePlannedWork = (id: string) => {
    dbDeletePlanned(id);
  };

  const buildSummaryText = useCallback((isForWhatsApp: boolean) => {
    const bold = (t: string) => isForWhatsApp ? `*${t}*` : t;
    let text = `${bold(`סיכום משמרת בקרה - ${shiftInfo.shiftType}`)}\nתאריך: ${shiftInfo.date}\nבקרים: ${shiftInfo.controllers.filter(Boolean).join(' ו- ')}\n\n`;
    
    const closed = faults.filter(f => f.status === 'closed');
    const open = faults.filter(f => f.status === 'open');

    text += `${bold(`תקלות שנסגרו:`)}\n`;
    closed.length ? closed.forEach((f, idx) => {
      text += `${idx + 1}. אתר ${f.siteNumber} (${f.siteName}) | השבתה: ${f.downtime} | טיפול: ${f.treatment || 'בוצע'}\n`;
    }) : text += `אין\n`;

    text += `\n${bold(`תקלות פתוחות:`)}\n`;
    open.length ? open.forEach((f, idx) => {
      text += `${idx + 1}. אתר ${f.siteNumber} (${f.siteName}) | סיבה: ${f.reason} | השבתה: ${f.downtime}${f.isPowerIssue ? ` | גיבוי: ${f.batteryBackupTime}` : ''}\n`;
    }) : text += `אין\n`;

    text += `\n${bold(`עבודות יזומות:`)}\n`;
    plannedWorks.length ? plannedWorks.forEach((p, idx) => {
      text += `${idx + 1}. ${p.description}\n`;
    }) : text += `אין\n`;

    text += `\n${bold(`אירועים מיוחדים:`)}\n${shiftInfo.generalNotes.trim() || 'אין'}`;
    return text;
  }, [faults, plannedWorks, shiftInfo]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Assistant']">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">ControlShift Sync</h1>
                {isConnected ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-400 animate-pulse" />}
              </div>
              <p className="text-xs text-slate-500 font-medium">סנכרון בזמן אמת - בסיס נתונים משותף</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-full px-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={16} />
              <span className="text-sm font-bold">{shiftInfo.shiftType}</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <span className="text-sm font-bold text-slate-600">{shiftInfo.date}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={async () => {
              setIsAiLoading(true);
              const sum = await generateAISummary(faults, plannedWorks, shiftInfo);
              if (sum) updateShiftNotes(sum);
              setIsAiLoading(false);
            }} disabled={isAiLoading} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition font-bold disabled:opacity-50">
              {isAiLoading ? <Clock className="animate-spin" size={18} /> : <Sparkles size={18} />}
              <span>ניתוח AI</span>
            </button>
            <button onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildSummaryText(true))}`, '_blank')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold">
              <Send size={18} />
              <span>שלח לווטסאפ</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4 border-b pb-2">
              <User size={20} className="text-blue-500" />
              <h2 className="font-bold text-slate-700">בקרים (שותף)</h2>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="בקר א'" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={shiftInfo.controllers[0]} onChange={(e) => updateControllers(0, e.target.value)} />
              <input type="text" placeholder="בקר ב'" className="w-full px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={shiftInfo.controllers[1]} onChange={(e) => updateControllers(1, e.target.value)} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4 border-b pb-2"><Zap size={20} className="text-orange-500" /><h2 className="font-bold text-slate-700">עבודות יזומות</h2></div>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="הוסף עבודה..." className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={newPlannedWork} onChange={(e) => setNewPlannedWork(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlannedWork()} />
              <button onClick={addPlannedWork} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700"><PlusCircle size={22} /></button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {plannedWorks.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                  <span className="text-sm font-medium">{p.description}</span>
                  <button onClick={() => removePlannedWork(p.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4 border-b pb-2"><FileText size={20} className="text-slate-500" /><h2 className="font-bold text-slate-700">אירועים משותפים</h2></div>
            <textarea rows={6} className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" placeholder="הערות שכולם רואים בזמן אמת..." value={shiftInfo.generalNotes} onChange={(e) => updateShiftNotes(e.target.value)} />
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-6 text-slate-800"><AlertCircle size={24} className="text-red-500" /><h2 className="text-lg font-bold">דיווח אתר נפול</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input type="text" placeholder="מספר אתר" className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={newFault.siteNumber} onChange={(e) => setNewFault(prev => ({ ...prev, siteNumber: e.target.value }))} />
              <input type="text" placeholder="שם אתר" className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={newFault.siteName} onChange={(e) => setNewFault(prev => ({ ...prev, siteName: e.target.value }))} />
              <input type="text" placeholder="סיבת ירידה" className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={newFault.reason} onChange={(e) => setNewFault(prev => ({ ...prev, reason: e.target.value }))} />
              <input type="text" placeholder="זמן השבתה (לדוג: 2ש' 15דק')" className="px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500" value={newFault.downtime} onChange={(e) => setNewFault(prev => ({ ...prev, downtime: e.target.value }))} />
            </div>
            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 text-sm">
                <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" checked={newFault.isPowerIssue} onChange={(e) => setNewFault(prev => ({ ...prev, isPowerIssue: e.target.checked }))} />
                תקלת חשמל
              </label>
              {newFault.isPowerIssue && <input type="text" placeholder="זמן גיבוי מצברים" className="flex-1 px-4 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm outline-none" value={newFault.batteryBackupTime} onChange={(e) => setNewFault(prev => ({ ...prev, batteryBackupTime: e.target.value }))} />}
            </div>
            <button onClick={addFault} className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg">הוסף למסד הנתונים</button>
          </Card>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-700 flex items-center gap-2"><Smartphone size={18} />אתרים בטיפול ({faults.length})</h3>
              <button onClick={() => { navigator.clipboard.writeText(buildSummaryText(false)); setShowCopySuccess(true); setTimeout(() => setShowCopySuccess(false), 2000); }} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 hover:bg-slate-50 shadow-sm">
                <ClipboardCheck size={14} className={showCopySuccess ? "text-green-500" : "text-slate-400"} />
                {showCopySuccess ? "הועתק!" : "העתק סיכום נקי"}
              </button>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50 text-slate-500 text-[11px] font-black uppercase border-b border-slate-200">
                  <tr><th className="px-4 py-3">אתר</th><th className="px-4 py-3">סיבה</th><th className="px-4 py-3">טיפול (עריכה משותפת)</th><th className="px-4 py-3">זמן</th><th className="px-4 py-3 text-center">סטטוס</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faults.map(f => (
                    <tr key={f.id} className={`transition-all duration-300 ${f.status === 'closed' ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'}`}>
                      <td className="px-4 py-4"><div className="font-bold text-slate-800 leading-none">{f.siteNumber}</div><div className="text-[10px] text-slate-400 mt-1">{f.siteName}</div></td>
                      <td className="px-4 py-4"><div className="text-sm">{f.reason}</div>{f.isPowerIssue && <div className="text-[10px] text-orange-600 font-bold mt-0.5">גיבוי: {f.batteryBackupTime}</div>}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 group"><input type="text" placeholder="מה בוצע..." className="w-full bg-transparent border-b border-dashed border-slate-200 focus:border-blue-400 outline-none text-sm py-1" value={f.treatment} onChange={(e) => updateFaultTreatment(f.id, e.target.value)} /><Edit3 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100" /></div>
                      </td>
                      <td className="px-4 py-4 text-xs font-bold text-slate-500">{f.downtime}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => toggleFaultStatus(f.id, f.status)} className={`p-2 rounded-lg transition-all ${f.status === 'closed' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>
                            {f.status === 'closed' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </button>
                          <button onClick={() => deleteFault(f.id)} className="p-2 text-slate-200 hover:text-red-500"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white border-t border-slate-200 py-2 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">NOC Realtime Dashboard • Google Cloud Powered</footer>
    </div>
  );
};

export default App;