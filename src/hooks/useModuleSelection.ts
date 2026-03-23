import { useState, useEffect, useCallback } from 'react';
import { Module, Programme, UserBasket } from '../utils/types';

export const useModuleSelection = (programme: Programme, db: Record<string, Module>) => {
  
  const [basket, setBasket] = useState<UserBasket>(() => {
    const savedBasket = localStorage.getItem('uoe-module-basket');
    if (savedBasket) {
      try { return JSON.parse(savedBasket); } catch (e) { console.error("Could not load saved plan."); }
    }
    return { "Stage 1": [], "Stage 2": [], "Stage 3": [], "Stage 4": [] };
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('uoe-module-basket', JSON.stringify(basket));
  }, [basket]);

  // THE RESET BUTTON LOGIC
  const clearBasket = useCallback(() => {
    setBasket({ "Stage 1": [], "Stage 2": [], "Stage 3": [], "Stage 4": [] });
    setError(null);
  }, []);

  const toggleModule = useCallback((code: string, stage: string) => {
    setBasket((prevBasket) => {
      const currentStageBasket = prevBasket[stage] || [];
      const isAlreadySelected = currentStageBasket.includes(code);

      if (isAlreadySelected) {
        setError(null); 
        return { ...prevBasket, [stage]: currentStageBasket.filter((c) => c !== code) };
      }

      const moduleData = db[code];
      const allSelectedModules = Object.values(prevBasket).flat();
      
      if (moduleData) {
        
        // NEW: THE 120 CREDIT CAP!
        const currentStageCredits = currentStageBasket.reduce((sum, c) => sum + (db[c]?.credits || 0), 0);
        if (currentStageCredits + moduleData.credits > 120) {
          setError(`Cannot add ${code}: You cannot exceed 120 credits in ${stage}.`);
          return prevBasket;
        }

        // Check for Incompatibilities
        if (moduleData.requirements?.incompatibilities?.length > 0) {
          const hasIncompatibility = moduleData.requirements.incompatibilities.some(inc => allSelectedModules.includes(inc));
          if (hasIncompatibility) {
            setError(`Cannot add ${code}: It is incompatible with a module already in your plan.`);
            return prevBasket; 
          }
        }

        // Check Prerequisites
        if (moduleData.requirements?.prerequisites) {
          const prereqsMet = moduleData.requirements.prerequisites.every(req => {
            if (req.type === "AND") return req.modules.every(reqCode => allSelectedModules.includes(reqCode));
            if (req.type === "OR") return req.modules.some(reqCode => allSelectedModules.includes(reqCode));
            return true;
          });

          if (!prereqsMet) {
            setError(`Cannot add ${code}: You are missing the required prerequisites.`);
            return prevBasket;
          }
        }
      }

      setError(null);
      return { ...prevBasket, [stage]: [...currentStageBasket, code] };
    });
  }, [db]);

  return { basket, error, toggleModule, clearBasket };
};