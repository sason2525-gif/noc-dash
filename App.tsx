import React, { useState, useCallback } from 'react';
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
  Edit3
} from 'lucide-react';
import { ShiftType, SiteFault, PlannedWork, ShiftSummary } from './types';
import { getCurrentShift, Card } from './constants';
import { generateAISummary } from './geminiService';

const App: React.FC = () => {
  // --- State ---
  const [shiftInfo, setShiftInfo] = useState<ShiftSummary>({
    controllers: ['', ''],
    shiftType: getCurrentShift() as ShiftType,
    date: new Date().toLocaleDateString('he-IL'),
    generalNotes: ''
  });

  const [faults, setFaults] = useState<SiteFault[]>([]);
  const [plannedWorks, setPlannedWorks] = useState<PlannedWork[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const [newFault, setNewFault] = useState<Partial<SiteFault>>({
    isPowerIssue: false,
    status: 'open',
    treatment: '',
    siteNumber: '',
    siteName: '',
    reason: '',
    downtime: '',
    batteryBackupTime: ''
  });

  const [newPlannedWork, setNewPlannedWork] = useState('');

  // --- Handlers ---
  const addFault = () => {
    if (!newFault.siteNumber || !newFault.siteName) {
      alert("נא להזין מספר אתר ושם אתר");
      return;
    }
    
    const fault: SiteFault = {
      id: crypto.randomUUID(),
      siteNumber: newFault.siteNumber || '',
      siteName: newFault.siteName || '',
      reason: newFault.reason || '',
      isPowerIssue: newFault.isPowerIssue || false,
      batteryBackupTime: newFault.batteryBackupTime,
      treatment: newFault.treatment || '',
      downtime: newFault.downtime || '',
      status: 'open',
      createdAt: Date.now()
    };

    setFaults(prev => [fault, ...prev]);
    setNewFault({ 
      isPowerIssue: false, 
      status: 'open', 
      treatment: '',
      siteNumber: '',
      siteName: '',
      reason: '',
      downtime: '',
      batteryBackupTime: ''
    });
  };

  const updateFaultTreatment = (id: string, treatment: string) => {
    setFaults(prev => prev.map(f => f.id === id ? { ...f, treatment } : f));
  };

  const toggleFaultStatus = (id: string) => {
    setFaults(prev => prev.map(f => 
      f.id === id ? { ...f, status: f.status === 'open' ? 'closed' : 'open' } : f
    ));
  };

  const deleteFault = (id: string) => {
    if (confirm("האם למחוק את התקלה מהרשימה?")) {
      setFaults(prev => prev.filter(f => f.id !== id));
    }
  };

  const addPlannedWork = () => {
    if (!newPlannedWork.trim()) return;
    const work: PlannedWork = {
      id: crypto.randomUUID(),
      description: newPlannedWork
    };
    setPlannedWorks(prev => [...prev, work]);
    setNewPlannedWork('');
  };

  const removePlannedWork = (id: string) => {
    setPlannedWorks(prev => prev.filter(p => p.id !== id));
  };

  const buildSummaryText = useCallback((isForWhatsApp: boolean) => {
    const bold = (t: string) => isForWhatsApp ? `*${t}*` : t;
    
    let text = `${bold(`📋 סיכום משמרת בקרה - ${shiftInfo.shiftType}`)}\n`;
    text += `📅 תאריך: ${shiftInfo.date}\n`;
    text += `👤 בקרים: ${shiftInfo.controllers.filter(Boolean).join(' & ')}\n\n`;
    
    const closedFaults = faults.filter(f => f.status === 'closed');
    const openFaults = faults.filter(f => f.status === 'open');

    text += `${bold(`✅ תקלות שנסגרו במהלך המשמרת:`)}\n`;
    if (closedFaults.length > 0) {
      closedFaults.forEach((f, idx) => {
        text += `${idx + 1}. אתר ${f.siteNumber} (${f.siteName}) - ${f.treatment || 'טופל'}\n`;
      });
    } else {
      text += `אין תקלות שנסגרו\n`;
    }
    text += `\n`;

    text += `${bold(`⚠️ תקלות שנותרו פתוחות:`)}\n`;
    if (openFaults.length > 0) {
      openFaults.forEach((f, idx) => {
        text += `${idx + 1}. אתר ${f.siteNumber} (${f.siteName}) - סיבה: ${f.reason} | סטטוס: בטיפול\n`;
      });
    } else {
      text += `אין תקלות פתוחות\n`;
    }
    text += `\n`;

    text += `${bold(`🛠️ עבודות יזומות:`)}\n`;
    if (plannedWorks.length > 0) {
      plannedWorks.forEach((p, idx) => {
        text += `${idx + 1}. ${p.description}\n`;
      });
    } else {
      text += `אין עבודות יזומות\n`;
    }
    text += `\n`;

    text += `${bold(`📝 אירועים מיוחדים:`)}\n`;
    text += shiftInfo.generalNotes.trim() || `אין אירועים מיוחדים`;
    
    return text;
  }, [faults, plannedWorks, shiftInfo]);

  const generateWhatsAppMessage = () => {
    const text = buildSummaryText(true);
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  const copyToClipboard = () => {
    const text = buildSummaryText(false);
    navigator.clipboard.writeText(text);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };

  const handleAiSummary = async () => {
    if (faults.length === 0 && plannedWorks.length === 0) return;
    setIsAiLoading(true);
    try {
      const summary = await generateAISummary(faults, plannedWorks, shiftInfo);
      if (summary) {
        setShiftInfo(prev => ({ ...prev, generalNotes: summary }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Assistant']">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
              <LayoutDashboard size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">ControlShift</h1>
              <p className="text-xs text-slate-500 font-medium">מערכת בקרת אתרים NOC</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-full px-4">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={16} />
              <span className="text-sm font-semibold">{shiftInfo.shiftType}</span>
            </div>
            <div className="w-px h-4 bg-slate-300"></div>
            <div className="flex items-center gap-2 text-slate-600">
              <History size={16} />
              <span className="text-sm font-semibold">{shiftInfo.date}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleAiSummary}
              disabled={isAiLoading || (faults.length === 0 && plannedWorks.length === 0)}
              className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition font-medium disabled:opacity-50"
            >
              {isAiLoading ? <Clock className="animate-spin" size={18} /> : <Sparkles size={18} />}
              <span>ניתוח AI</span>
            </button>
            <button 
              onClick={generateWhatsAppMessage}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium shadow-md shadow-green-100"
            >
              <Send size={18} />
              <span>שלח לווטסאפ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
              <User size={20} className="text-blue-500" />
              <h2 className="font-bold">פרטי בקרים</h2>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="בקר 1 (שם מלא)"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={shiftInfo.controllers[0]}
                onChange={(e) => setShiftInfo(prev => ({ ...prev, controllers: [e.target.value, prev.controllers[1]] }))}
              />
              <input 
                type="text" 
                placeholder="בקר 2 (שם מלא)"
                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={shiftInfo.controllers[1]}
                onChange={(e) => setShiftInfo(prev => ({ ...prev, controllers: [prev.controllers[0], e.target.value] }))}
              />
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
              <Zap size={20} className="text-orange-500" />
              <h2 className="font-bold">עבודות יזומות</h2>
            </div>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="תיאור עבודה יזומה..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                value={newPlannedWork}
                onChange={(e) => setNewPlannedWork(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlannedWork()}
              />
              <button onClick={addPlannedWork} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-700 transition shadow-sm">
                <PlusCircle size={24} />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {plannedWorks.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100 group">
                  <span className="text-sm font-medium text-slate-700">{p.description}</span>
                  <button onClick={() => removePlannedWork(p.id)} className="text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {plannedWorks.length === 0 && <p className="text-center text-slate-400 text-xs py-2">אין עבודות יזומות</p>}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 mb-4 text-slate-800 border-b pb-2">
              <FileText size={20} className="text-slate-500" />
              <h2 className="font-bold">אירועים מיוחדים / סיכום</h2>
            </div>
            <textarea 
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none transition-all"
              placeholder="רשום כאן אירועים חריגים שקרו במשמרת או השתמש בניתוח AI..."
              value={shiftInfo.generalNotes}
              onChange={(e) => setShiftInfo(prev => ({ ...prev, generalNotes: e.target.value }))}
            />
          </Card>
        </div>

        {/* Main Section */}
        <div className="lg:col-span-8 space-y-6">
          {/* New Fault Form */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-slate-800">
                <AlertCircle size={24} className="text-red-500" />
                <h2 className="text-lg font-bold">דיווח אתר נפול</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">מספר אתר</label>
                <input 
                  type="text" 
                  placeholder="לדוגמא: 1234"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newFault.siteNumber || ''}
                  onChange={(e) => setNewFault(prev => ({ ...prev, siteNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">שם אתר</label>
                <input 
                  type="text" 
                  placeholder="לדוגמא: תל אביב מרכז"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newFault.siteName || ''}
                  onChange={(e) => setNewFault(prev => ({ ...prev, siteName: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">סיבת ירידה</label>
                <input 
                  type="text" 
                  placeholder="לדוגמא: הפסקת חשמל"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newFault.reason || ''}
                  onChange={(e) => setNewFault(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 mr-1">זמן השבתה</label>
                <input 
                  type="text" 
                  placeholder="לדוגמא: 45 דק'"
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={newFault.downtime || ''}
                  onChange={(e) => setNewFault(prev => ({ ...prev, downtime: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-6 mb-6">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  checked={newFault.isPowerIssue}
                  onChange={(e) => setNewFault(prev => ({ ...prev, isPowerIssue: e.target.checked }))}
                />
                <span className="text-sm font-semibold text-slate-700 select-none">בעיית חשמל?</span>
              </label>

              {newFault.isPowerIssue && (
                <div className="flex-1 animate-in fade-in slide-in-from-right-2 duration-300">
                  <input 
                    type="text" 
                    placeholder="כמה זמן גיבוי מצברים נותר?"
                    className="w-full px-4 py-2 rounded-lg border border-orange-200 bg-orange-50 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={newFault.batteryBackupTime || ''}
                    onChange={(e) => setNewFault(prev => ({ ...prev, batteryBackupTime: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <button 
              onClick={addFault}
              className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-100 active:scale-[0.98]"
            >
              הוסף תקלה לרשימה
            </button>
          </Card>

          {/* Faults Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Smartphone size={18} />
                ניהול תקלות ({faults.length})
              </h3>
              <button 
                onClick={copyToClipboard}
                className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-slate-50 transition shadow-sm active:scale-95"
              >
                <ClipboardCheck size={14} className={showCopySuccess ? "text-green-500" : "text-slate-400"} />
                {showCopySuccess ? "הועתק!" : "העתק סיכום מבנה"}
              </button>
            </div>

            <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">אתר</th>
                    <th className="px-4 py-3">סיבה</th>
                    <th className="px-4 py-3">כיצד טופל (ניתן לערוך)</th>
                    <th className="px-4 py-3">זמן</th>
                    <th className="px-4 py-3 text-center">סטטוס / פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {faults.map(f => (
                    <tr 
                      key={f.id} 
                      className={`transition-colors duration-300 group ${f.status === 'closed' ? 'bg-emerald-50/80' : 'bg-white hover:bg-slate-50/50'}`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{f.siteNumber}</div>
                        <div className="text-xs text-slate-500">{f.siteName}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-slate-700">{f.reason}</div>
                        {f.isPowerIssue && <div className="text-[10px] text-orange-600 font-bold mt-1 bg-orange-100 inline-block px-1 rounded">גיבוי: {f.batteryBackupTime}</div>}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative group/edit">
                          <input 
                            type="text"
                            placeholder="הזן טיפול..."
                            className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-blue-500 outline-none text-sm py-1 transition-colors"
                            value={f.treatment}
                            onChange={(e) => updateFaultTreatment(f.id, e.target.value)}
                          />
                          <Edit3 size={12} className="absolute left-0 top-2 text-slate-300 opacity-0 group-hover/edit:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-slate-500">{f.downtime}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => toggleFaultStatus(f.id)}
                            title={f.status === 'open' ? 'סגור תקלה' : 'פתח מחדש'}
                            className={`p-2 rounded-lg transition-all duration-200 active:scale-90 ${
                              f.status === 'closed' 
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                              : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                          >
                            {f.status === 'closed' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => deleteFault(f.id)} 
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                            title="מחק"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {faults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">אין תקלות רשומות כרגע</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-center">
        <p className="text-xs text-slate-400">ControlShift v1.0 • פותח עבור צוות NOC • 2025</p>
      </footer>
    </div>
  );
};

export default App;