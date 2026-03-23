import { useState } from 'react';
import { SidebarLayout } from './components/Sidebar/SidebarLayout';
import { ModuleGraph } from './components/Graph/ModuleGraph';
import { useModuleSelection } from './hooks/useModuleSelection';
import { Module, Programme } from './utils/types';

// Import our separated Data!
import overridesData from './data/overrides.json';

const moduleFiles = import.meta.glob('./data/modules/*.json', { eager: true });
const realModulesDb: Record<string, Module> = {};

// Map the JSON data to variables for the loop
const CREDIT_OVERRIDES: Record<string, number> = overridesData.credits;
const PREREQ_OVERRIDES: Record<string, string[]> = overridesData.prerequisites;

for (const path in moduleFiles) {
  const moduleData = (moduleFiles[path] as any).default || moduleFiles[path];
  
  const overridePrereqs = PREREQ_OVERRIDES[moduleData.code];
  let strictPrereqs = (moduleData.prerequisites || []).length > 0 
    ? [{ type: "AND", modules: moduleData.prerequisites }] : [];
    
  if (overridePrereqs) {
    strictPrereqs = [{ type: "AND", modules: overridePrereqs }];
  }

  const normalizedStage = typeof moduleData.stage === 'number' ? `Stage ${moduleData.stage}` : moduleData.stage;
  const finalCredits = CREDIT_OVERRIDES[moduleData.code] !== undefined ? CREDIT_OVERRIDES[moduleData.code] : (moduleData.credits || 15);

  realModulesDb[moduleData.code] = {
    ...moduleData,
    stage: normalizedStage,
    credits: finalCredits,
    requirements: { 
      prerequisites: strictPrereqs, 
      corequisites: moduleData.corequisites || [], 
      incompatibilities: moduleData.incompatibilities || [] 
    }
  };
}

const mockProgramme: Programme = {
  programmeCode: "MMATH",
  stages: {
    "Stage 1": { totalCreditsRequired: 120, maxFreeChoiceCredits: 0, ruleBlocks: [] },
    "Stage 2": { totalCreditsRequired: 120, maxFreeChoiceCredits: 30, ruleBlocks: [] },
    "Stage 3": { totalCreditsRequired: 120, maxFreeChoiceCredits: 30, ruleBlocks: [] },
    "Stage 4": { totalCreditsRequired: 120, maxFreeChoiceCredits: 30, ruleBlocks: [] }
  }
};

function App() {
  const { basket, error, toggleModule, clearBasket } = useModuleSelection(mockProgramme, realModulesDb as any);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const activeModule = activeModuleCode ? realModulesDb[activeModuleCode] ?? null : null;

  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={`flex h-screen w-screen overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-[#f8f9fa]'}`}>
      <SidebarLayout 
        basket={basket} 
        error={error} 
        activeModule={activeModule}
        modulesDb={realModulesDb}
        clearBasket={clearBasket} 
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
      
      <div className="flex-1 h-full relative">
        <ModuleGraph 
          onModuleClick={(code) => setActiveModuleCode(code)}
          onModuleAdd={(code, stage) => toggleModule(code, stage)}
          basket={basket}
          modulesDb={realModulesDb} 
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;