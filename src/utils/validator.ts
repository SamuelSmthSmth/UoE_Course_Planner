// validator.ts
import { Module, Programme, UserBasket, ValidationResult } from './types';

export const validateModuleAddition = (
  targetModule: Module,
  currentStage: string,
  userBasket: UserBasket,
  programmeRules: Programme,
  allModulesDb: Record<string, Module>
): ValidationResult => {
  
  const stageRules = programmeRules.stages[currentStage];
  const currentStageModules = userBasket[currentStage] || [];
  const allSelectedModules = Object.values(userBasket).flat();

  // 1. Check Incompatibilities
  const hasIncompatible = targetModule.requirements.incompatibilities.some(
    (code) => allSelectedModules.includes(code)
  );
  if (hasIncompatible) {
    return { isValid: false, reason: "Incompatible with a module already selected." };
  }

  // 2. Check Total Credits
  const currentCredits = currentStageModules.reduce(
    (sum, code) => sum + allModulesDb[code].credits, 0
  );
  if (currentCredits + targetModule.credits > stageRules.totalCreditsRequired) {
    return { isValid: false, reason: `Exceeds the ${stageRules.totalCreditsRequired} credit limit.` };
  }

  // 3. Check Free Choice (Electives)
  const isCoreMath = targetModule.code.startsWith("MTH") || targetModule.code.startsWith("EMP");
  if (!isCoreMath) {
    const currentFreeCredits = currentStageModules
      .filter(code => !code.startsWith("MTH") && !code.startsWith("EMP"))
      .reduce((sum, code) => sum + allModulesDb[code].credits, 0);

    if (currentFreeCredits + targetModule.credits > stageRules.maxFreeChoiceCredits) {
      return { isValid: false, reason: `Exceeds max free choice allowance (${stageRules.maxFreeChoiceCredits} credits).` };
    }
  }

  // 4. Check Block Limits (e.g., "Pick max 90 credits from Pure Math")
  const targetBlock = stageRules.ruleBlocks.find(block => block.modules.includes(targetModule.code));
  if (targetBlock) {
    const creditsInBlock = currentStageModules
      .filter(code => targetBlock.modules.includes(code))
      .reduce((sum, code) => sum + allModulesDb[code].credits, 0);

    if (creditsInBlock + targetModule.credits > targetBlock.maxCredits) {
      return { isValid: false, reason: `Exceeds max credits (${targetBlock.maxCredits}) for ${targetBlock.blockName}.` };
    }
  }

  // 5. Check Prerequisites
  for (const req of targetModule.requirements.prerequisites) {
    if (req.type === "AND") {
      const hasAll = req.modules.every(code => allSelectedModules.includes(code));
      if (!hasAll) return { isValid: false, reason: `Missing prerequisites: ${req.modules.join(" AND ")}` };
    } else if (req.type === "OR") {
      const hasOne = req.modules.some(code => allSelectedModules.includes(code));
      if (!hasOne) return { isValid: false, reason: `Requires at least one of: ${req.modules.join(" OR ")}` };
    }
  }

  return { isValid: true };
};