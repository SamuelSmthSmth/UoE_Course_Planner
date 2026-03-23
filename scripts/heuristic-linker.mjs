#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MODULE_DIR = 'src/data/modules';

const getCodeLevelDigit = (code) => {
  const normalized = String(code ?? '').toUpperCase();
  const match = normalized.match(/^[A-Z]+(\d)/);
  return match ? Number.parseInt(match[1], 10) : null;
};

const inferStage = (moduleRecord) => {
  const code = String(moduleRecord.code ?? '').toUpperCase();

  if (typeof moduleRecord.stage === 'string' && /^Stage\s+[1-4]$/.test(moduleRecord.stage)) {
    return moduleRecord.stage;
  }

  if (typeof moduleRecord.year === 'string') {
    const yearMatch = moduleRecord.year.match(/Year\s+([1-4])/i);
    if (yearMatch) {
      return `Stage ${yearMatch[1]}`;
    }
  }

  const levelDigit = getCodeLevelDigit(code);
  if (levelDigit === 1) {
    return 'Stage 1';
  }

  if (levelDigit === 2) {
    return 'Stage 2';
  }

  if (levelDigit === 3) {
    return 'Stage 3';
  }

  if (levelDigit !== null && levelDigit >= 4 && code.startsWith('M')) {
    return 'Stage 4';
  }

  return 'Stage 1';
};

const run = async () => {
  const moduleDir = path.resolve(process.cwd(), MODULE_DIR);
  const files = (await fs.readdir(moduleDir)).filter((name) => name.endsWith('.json')).sort();

  const modules = [];
  for (const file of files) {
    const filePath = path.join(moduleDir, file);
    const parsed = JSON.parse(await fs.readFile(filePath, 'utf8'));
    modules.push({ filePath, parsed });
  }

  const moduleCodeSet = new Set(modules.map((entry) => String(entry.parsed.code ?? '').toUpperCase()));
  const has1001 = moduleCodeSet.has('MTH1001');
  const has1002 = moduleCodeSet.has('MTH1002');
  const fallbackAnchor = has1001 ? 'MTH1001' : has1002 ? 'MTH1002' : '';

  let updatedCount = 0;

  for (const entry of modules) {
    const moduleData = entry.parsed;
    const code = String(moduleData.code ?? '').toUpperCase();

    const prerequisites = new Set(Array.isArray(moduleData.prerequisites) ? moduleData.prerequisites : []);

    const mth2Match = code.match(/^MTH2(\d{3})[A-Z0-9]*$/);
    if (mth2Match) {
      const suffix = mth2Match[1];
      const directMatch = `MTH1${suffix}`;

      if (moduleCodeSet.has(directMatch)) {
        prerequisites.add(directMatch);
      } else if (fallbackAnchor) {
        prerequisites.add(fallbackAnchor);
      }
    }

    const stage = inferStage(moduleData);

    const cleaned = {
      ...moduleData,
      stage,
      credits: typeof moduleData.credits === 'number' ? moduleData.credits : Number(moduleData.credits ?? 0),
      prerequisites: [...prerequisites].sort((a, b) => a.localeCompare(b)),
      corequisites: Array.isArray(moduleData.corequisites) ? moduleData.corequisites : [],
      incompatibilities: Array.isArray(moduleData.incompatibilities) ? moduleData.incompatibilities : []
    };

    delete cleaned.year;

    await fs.writeFile(entry.filePath, `${JSON.stringify(cleaned, null, 2)}\n`, 'utf8');
    updatedCount += 1;
  }

  console.log(`Heuristic Linker updated ${updatedCount} module files in ${MODULE_DIR}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
