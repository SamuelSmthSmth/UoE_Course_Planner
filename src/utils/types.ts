// types.ts

export type RequirementType = "AND" | "OR";

export interface Requirement {
  type: RequirementType;
  modules: string[];
}

export interface Module {
  code: string;
  title: string;
  credits: number;
  stage: number;
  requirements: {
    prerequisites: Requirement[];
    corequisites: string[];
    incompatibilities: string[];
  };
}

export interface RuleBlock {
  blockName: string;
  minCredits: number;
  maxCredits: number;
  modules: string[]; // e.g., ["MTH2003", "MTH2004", "MTH2008"]
}

export interface StageRules {
  totalCreditsRequired: number; // Usually 120
  maxFreeChoiceCredits: number; // Usually 30
  ruleBlocks: RuleBlock[];
}

export interface Programme {
  programmeCode: string;
  stages: Record<string, StageRules>; 
}

export interface UserBasket {
  [stage: string]: string[]; // e.g., { "Stage 1": ["MTH1000", "MTH1001"] }
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}