import React from 'react';

interface SidebarProps {
  basket: any;
  error: string | null;
  activeModule: any | null;
  modulesDb: any; 
  clearBasket: () => void; 
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const SidebarLayout = ({ basket, error, activeModule, modulesDb, clearBasket, isDarkMode, toggleDarkMode }: SidebarProps) => {
  
  // Calculate total credits for a stage
  const calculateStageCredits = (stage: string) => {
    if (!modulesDb) return 0; 
    return (basket[stage] || []).reduce((sum: number, code: string) => sum + (modulesDb[code]?.credits || 0), 0);
  };

  // NEW: Calculate Term Balance (Autumn vs Spring)
  const calculateTermSplit = (stage: string) => {
    let aut = 0;
    let spr = 0;
    if (!modulesDb) return { aut, spr };

    (basket[stage] || []).forEach((code: string) => {
      const mod = modulesDb[code];
      if (!mod) return;
      
      const term = (mod.term || "").toUpperCase();
      const credits = mod.credits || 0;

      // If it spans both terms (like a 30 credit module), split it 15/15
      if (credits === 30 || term.includes('YEAR') || (term.includes('AUT') && term.includes('SPR'))) {
        aut += (credits / 2);
        spr += (credits / 2);
      } else if (term.includes('AUT') || term.includes('T1')) {
        aut += credits;
      } else if (term.includes('SPR') || term.includes('T2')) {
        spr += credits;
      }
    });
    return { aut, spr };
  };

  const stages = ["Stage 1", "Stage 2", "Stage 3", "Stage 4"];
  const stageColors = ['bg-green-500', 'bg-amber-400', 'bg-blue-500', 'bg-purple-500'];
  const stageTextColors = ['text-green-500', 'text-amber-500', 'text-blue-500', 'text-purple-500'];

  return (
    <div className={`w-96 h-screen border-r flex flex-col shadow-lg font-sans z-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      
      <div className={`p-6 flex justify-between items-start shrink-0 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-[#003c3c] text-white'}`}>
        <div>
          <h1 className="text-xl font-bold tracking-wide">Module Selector</h1>
          <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-300'}`}>MMath Mathematics</p>
        </div>
        <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-black/20 transition-colors">
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>

      {error && (
        <div className={`m-4 p-3 border-l-4 text-sm font-medium rounded shadow-sm transition-all shrink-0 ${isDarkMode ? 'bg-red-900/50 border-red-500 text-red-200' : 'bg-red-100 border-red-500 text-red-700'}`}>
          ⚠️ {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <h2 className={`text-sm font-bold uppercase tracking-wider mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Credit Progress</h2>
        
        {stages.map((stageName, idx) => {
          const credits = calculateStageCredits(stageName);
          const { aut, spr } = calculateTermSplit(stageName);
          
          return (
            <div key={stageName} className={`p-3 rounded-lg shadow-sm border transition-colors ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'}`}>
              <div className="flex justify-between items-end mb-2">
                <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{stageName}</h3>
                <span className={`text-xs font-bold ${isDarkMode ? stageTextColors[idx] : 'text-[#003c3c]'}`}>{credits} / 120</span>
              </div>
              <div className={`w-full rounded-full h-2 mb-2 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
                <div className={`${stageColors[idx]} h-2 rounded-full transition-all duration-300`} style={{ width: `${Math.min((credits / 120) * 100, 100)}%` }}></div>
              </div>
              {/* Term Split Indicator */}
              <div className={`flex justify-between text-[10px] font-mono font-bold uppercase ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>AUT: {aut} cr</span>
                <span>SPR: {spr} cr</span>
              </div>
            </div>
          );
        })}

        {/* THE RESET BUTTON */}
        <button onClick={clearBasket} className={`w-full mt-6 py-2 border-2 rounded-md text-sm font-bold transition-all flex justify-center items-center gap-2 ${isDarkMode ? 'border-red-900/50 text-red-400 hover:bg-red-900/30 hover:border-red-800' : 'border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Reset Degree Plan
        </button>

      </div>

      <div className={`h-2/5 min-h-[260px] border-t p-6 overflow-y-auto shrink-0 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        {!activeModule ? (
          <div className={`h-full flex flex-col items-center justify-center italic ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <p>Click a module on the graph</p>
            <p>to view details.</p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <div className="flex justify-between items-start">
                <h2 className={`text-lg font-bold ${isDarkMode ? 'text-teal-400' : 'text-[#003c3c]'}`}>{activeModule.code}</h2>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded border ${isDarkMode ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                  {activeModule.credits} Credits
                </span>
              </div>
              <h3 className={`text-md font-medium mt-1 ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{activeModule.title}</h3>
            </div>
             <div className={`pt-3 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <h4 className={`text-sm font-bold mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Module Info</h4>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className={`font-semibold ${isDarkMode ? 'text-gray-300' : ''}`}>Delivery Term:</span> {activeModule.term || "Unknown"}
                </p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};