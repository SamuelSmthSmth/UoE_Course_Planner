#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const MODULE_CODE_REGEX = /\b[A-Z]{2,4}\d{3,4}[A-Z0-9]*\b/g;
const MODULE_CODE_SINGLE_REGEX = /^[A-Z]{2,4}\d{3,4}[A-Z0-9]*$/;
const UUID_REGEX = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const PREREQ_HINT_REGEX = /(prereq|pre-?requisite|required|requires|must\s+have|entry\s+requirement|prior\s+study|dependenc)/i;
const COREQ_HINT_REGEX = /(co-?req|co-?requisite|concurrent|taken\s+with)/i;
const INCOMPAT_HINT_REGEX = /(incompat|cannot\s+be\s+taken|must\s+not\s+be\s+taken|mutually\s+exclusive|exclusion)/i;

const usage = () => {
    console.log(
        [
            'Usage:',
            '  node scripts/split-timeedit-modules.mjs --input <raw.json> [--output src/data/modules] [--path data.modules]',
            '',
            'Options:',
            '  --input   Path to raw TimeEdit JSON file (default: raw-timeedit-sample.json)',
            '  --output  Directory for split module files (default: src/data/modules)',
            '  --path    Dot path to module list/object if known',
            '',
            'Output file shape:',
            '  { code, title, credits, term, year, prerequisites, corequisites, incompatibilities, relations }'
        ].join('\n')
    );
};

const parseArgs = (argv) => {
    const args = {
        input: 'raw-timeedit-sample.json',
        output: 'src/data/modules',
        path: ''
    };

    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i];

        if (token === '--input') {
            args.input = argv[i + 1] ?? args.input;
            i += 1;
            continue;
        }

        if (token === '--output') {
            args.output = argv[i + 1] ?? args.output;
            i += 1;
            continue;
        }

        if (token === '--path') {
            args.path = argv[i + 1] ?? '';
            i += 1;
            continue;
        }

        if (token === '--help' || token === '-h') {
            usage();
            process.exit(0);
        }
    }

    return args;
};

const toNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }

    return null;
};

const firstNonEmptyString = (values) => {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
};

const flattenStrings = (value) => {
    if (typeof value === 'string') {
        return [value];
    }

    if (Array.isArray(value)) {
        return value.flatMap((item) => flattenStrings(item));
    }

    if (value && typeof value === 'object') {
        return Object.values(value).flatMap((item) => flattenStrings(item));
    }

    return [];
};

const findValuesByKey = (value, keyName) => {
    const results = [];

    const visit = (node) => {
        if (!node || typeof node !== 'object') {
            return;
        }

        if (Array.isArray(node)) {
            for (const item of node) {
                visit(item);
            }
            return;
        }

        for (const [key, child] of Object.entries(node)) {
            if (key.toLowerCase() === keyName.toLowerCase()) {
                results.push(child);
            }

            if (child && typeof child === 'object') {
                visit(child);
            }
        }
    };

    visit(value);
    return results;
};

const getEnglishName = (value) => {
    if (!value) {
        return '';
    }

    if (typeof value.englishName === 'string' && value.englishName.trim()) {
        return value.englishName.trim();
    }

    if (Array.isArray(value.names)) {
        const english = value.names.find((item) => item?.language === 'EN' && typeof item.value === 'string');
        if (english?.value?.trim()) {
            return english.value.trim();
        }

        const first = value.names.find((item) => typeof item?.value === 'string');
        if (first?.value?.trim()) {
            return first.value.trim();
        }
    }

    return '';
};

const extractModuleCodes = (value, idToCodeMap = new Map()) => {
    const collector = new Set();

    for (const text of flattenStrings(value)) {
        const textWithoutUuids = text.replace(UUID_REGEX, ' ');
        const normalizedText = textWithoutUuids.toUpperCase();
        const matches = normalizedText.match(MODULE_CODE_REGEX) ?? [];
        for (const match of matches) {
            collector.add(match);
        }

        const uuidMatches = text.match(UUID_REGEX) ?? [];
        for (const uuid of uuidMatches) {
            const mappedCode = idToCodeMap.get(uuid.toLowerCase());
            if (mappedCode) {
                collector.add(mappedCode);
            }
        }
    }

    return [...collector];
};

const detectRelationCategory = (text) => {
    const normalized = String(text ?? '');
    if (INCOMPAT_HINT_REGEX.test(normalized)) {
        return 'incompatibilities';
    }

    if (COREQ_HINT_REGEX.test(normalized)) {
        return 'corequisites';
    }

    if (PREREQ_HINT_REGEX.test(normalized)) {
        return 'prerequisites';
    }

    return '';
};

const parseLevelNumber = (value) => {
    const asString = String(value ?? '').toLowerCase();
    const levelMatch = asString.match(/level\s*([1-9]\d*)|^l\s*([1-9]\d*)$/i);
    if (levelMatch) {
        return Number(levelMatch[1] ?? levelMatch[2]);
    }

    const stageMatch = asString.match(/year\s*([1-9]\d*)|stage\s*([1-9]\d*)/i);
    if (stageMatch) {
        return Number(stageMatch[1] ?? stageMatch[2]);
    }

    const numeric = Number.parseInt(asString, 10);
    if (Number.isFinite(numeric)) {
        return numeric;
    }

    return null;
};

const mapLevelToStudyYear = (levelLike) => {
    const level = parseLevelNumber(levelLike);
    if (level === null) {
        return '';
    }

    if (level <= 1 || level === 4) {
        return 'Year 1';
    }

    if (level === 2 || level === 5) {
        return 'Year 2';
    }

    if (level === 3 || level >= 6) {
        return 'Year 3';
    }

    return '';
};

const mapStageToStudyYear = (stage) => {
    const stageNum = Number(stage);
    if (!Number.isFinite(stageNum)) {
        return '';
    }

    if (stageNum <= 1) {
        return 'Year 1';
    }

    if (stageNum === 2) {
        return 'Year 2';
    }

    return 'Year 3';
};

const mapCodeToStudyYear = (moduleCode) => {
    const normalized = String(moduleCode ?? '').toUpperCase();
    const match = normalized.match(/^[A-Z]{2,4}(\d)/);
    if (!match) {
        return '';
    }

    const digit = Number.parseInt(match[1], 10);
    if (digit === 1 || digit === 4) {
        return 'Year 1';
    }

    if (digit === 2 || digit === 5) {
        return 'Year 2';
    }

    if (digit === 3 || digit >= 6) {
        return 'Year 3';
    }

    return '';
};

const mapCodeToStage = (moduleCode) => {
    const normalized = String(moduleCode ?? '').toUpperCase();
    
    // MTH1*** -> Stage 1, MTH2*** -> Stage 2, MTH3*** -> Stage 3
    if (/^MTH[1-3]\d{3}/.test(normalized)) {
        const digit = Number.parseInt(normalized[3], 10);
        return `Stage ${digit}`;
    }
    
    // MTHM*** -> Stage 4
    if (/^MTHM\d{3}/.test(normalized)) {
        return 'Stage 4';
    }
    
    return '';
};

const mapYearLikeToStudyYear = (yearLike) => {
    const value = String(yearLike ?? '').trim();
    if (!value) {
        return '';
    }

    if (/^\d{4}-\d{2}$/.test(value)) {
        return '';
    }

    return mapLevelToStudyYear(value);
};

const getPath = (obj, dotPath) => {
    if (!dotPath) {
        return obj;
    }

    return dotPath.split('.').reduce((acc, key) => {
        if (acc && typeof acc === 'object' && key in acc) {
            return acc[key];
        }

        return undefined;
    }, obj);
};

const autoDetectRoot = (parsed) => {
    if (parsed?.data?.groups && Array.isArray(parsed.data.groups)) {
        return parsed.data.groups;
    }

    const likelyPaths = [
        ['modules'],
        ['MODULES'],
        ['module'],
        ['MODULE'],
        ['data', 'modules'],
        ['data', 'items'],
        ['items']
    ];

    for (const pathParts of likelyPaths) {
        let current = parsed;
        let valid = true;

        for (const part of pathParts) {
            if (!current || typeof current !== 'object' || !(part in current)) {
                valid = false;
                break;
            }

            current = current[part];
        }

        if (valid) {
            return current;
        }
    }

    return parsed;
};

const extractStructureModuleRecords = (groups) => {
    const records = [];

    const visitGroupWrapper = (wrapper, inheritedStage = null) => {
        const group = wrapper?.group ?? wrapper;
        if (!group || typeof group !== 'object') {
            return;
        }

        const groupLabel = getEnglishName(group) || String(group.code ?? '');
        const stageMatch = groupLabel.match(/stage\s*(\d+)/i);
        const stage = stageMatch ? Number(stageMatch[1]) : inheritedStage;

        const modules = Array.isArray(group.modules) ? group.modules : [];
        for (const moduleEntry of modules) {
            const moduleObj = moduleEntry?.module ?? {};
            records.push({
                ...moduleObj,
                __moduleEntry: moduleEntry,
                __stage: stage
            });
        }

        const subgroups = Array.isArray(group.groups) ? group.groups : [];
        for (const subgroup of subgroups) {
            visitGroupWrapper(subgroup, stage);
        }
    };

    for (const groupWrapper of groups) {
        visitGroupWrapper(groupWrapper);
    }

    return records;
};

const isLikelyModuleRecord = (record) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        return false;
    }

    const directCode = firstNonEmptyString([
        record.code,
        record.moduleCode,
        record.courseCode,
        record.externalId,
        record.module?.code
    ]).toUpperCase();

    if (!MODULE_CODE_SINGLE_REGEX.test(directCode)) {
        return false;
    }

    const title = firstNonEmptyString([record.englishName, record.title, record.name, record.module?.englishName]);
    if (!title) {
        return false;
    }

    const hasModuleSignals =
        'credits' in record ||
        'level' in record ||
        'year' in record ||
        'term' in record ||
        'period' in record ||
        'relations' in record ||
        'additional' in record ||
        'requirements' in record ||
        'prerequisites' in record;

    if (hasModuleSignals) {
        return true;
    }

    const typeValue = String(record.type ?? '').toUpperCase();
    return typeValue === 'MODULE' || typeValue === 'MODULE_INSTANCE';
};

const gatherCandidateRecords = (value) => {
    const results = [];

    const visit = (node) => {
        if (!node) {
            return;
        }

        if (Array.isArray(node)) {
            for (const item of node) {
                visit(item);
            }
            return;
        }

        if (typeof node !== 'object') {
            return;
        }

        if (isLikelyModuleRecord(node)) {
            results.push(node);
            return;
        }

        for (const child of Object.values(node)) {
            if (child && typeof child === 'object') {
                visit(child);
            }
        }
    };

    visit(value);
    return results;
};

const pickCode = (record) => {
    const codeCandidates = [
        record.code,
        record.moduleCode,
        record.module_code,
        record.shortCode,
        record.short_code,
        record.id,
        record.module,
        record.kod,
        record.courseCode,
        record.course_code,
        record.module?.code,
        record.module?.courseCode,
        record.moduleInfo?.code,
        record.externalId
    ];

    const direct = firstNonEmptyString(codeCandidates);
    if (direct) {
        const normalized = direct.toUpperCase();
        const match = normalized.match(MODULE_CODE_REGEX);
        if (match) {
            return match[0];
        }

        if (MODULE_CODE_SINGLE_REGEX.test(normalized)) {
            return normalized;
        }
    }

    const allStrings = flattenStrings(record).join(' ');
    const fallbackMatch = allStrings.match(MODULE_CODE_REGEX);
    return fallbackMatch ? fallbackMatch[0] : '';
};

const pickTitle = (record) =>
    firstNonEmptyString([
        record.englishName,
        getEnglishName(record),
        record.module?.englishName,
        record.moduleInfo?.englishName,
        record.title,
        record.moduleTitle,
        record.module_title,
        record.name,
        record.courseName,
        record.course_name,
        record.namn
    ]);

const pickTerm = (record) =>
    firstNonEmptyString([
        record.__moduleEntry?.offerings?.[0]?.period?.code,
        record.__moduleEntry?.offerings?.[0]?.period?.englishName,
        record.term,
        record.term?.code,
        record.term?.englishName,
        record.semester,
        record.semester?.code,
        record.semester?.englishName,
        record.period,
        record.period?.code,
        record.period?.englishName,
        record.studyPeriod,
        record.study_period,
        record.termin
    ]);

const pickCredits = (record) => {
    const creditCandidates = [
        record.__moduleEntry?.credits?.optimum,
        record.__moduleEntry?.credits?.value,
        record.__moduleEntry?.values,
        record.credits?.optimum,
        record.credits?.optimum?.value,
        record.credits?.optimum?.englishName,
        record.credits?.value,
        record.creditInfo?.optimum,
        record.credit?.optimum,
        record.credits,
        record.credit,
        record.hp,
        record.ects,
        record.points,
        record.creditPoints,
        record.credit_points
    ];

    for (const candidate of creditCandidates) {
        const parsed = toNumber(candidate);
        if (parsed !== null) {
            return parsed;
        }
    }

    const allStrings = flattenStrings(record).join(' ');
    const creditMatch = allStrings.match(/([0-9]+(?:\.[0-9]+)?)\s*(credits|ects|hp)/i);
    if (!creditMatch) {
        return null;
    }

    return toNumber(creditMatch[1]);
};

const pickYear = (record, moduleCode) => {
    const fromStage = mapStageToStudyYear(record.__stage);
    if (fromStage) {
        return fromStage;
    }

    const yearCandidates = [
        record.level,
        record.level?.code,
        record.level?.englishName,
        record.levelOfStudy,
        record.levelOfStudy?.code,
        record.levelOfStudy?.englishName,
        record.stage,
        record.stage?.code,
        record.stage?.englishName,
        record.year,
        record.year?.code,
        record.year?.englishName,
        record.yearCode,
        record.year_code
    ];

    for (const candidate of yearCandidates) {
        const mappedFromLevel = mapLevelToStudyYear(candidate);
        if (mappedFromLevel) {
            return mappedFromLevel;
        }
    }

    for (const candidate of yearCandidates) {
        const mappedFromYearLike = mapYearLikeToStudyYear(candidate);
        if (mappedFromYearLike) {
            return mappedFromYearLike;
        }
    }

    const mappedFromCode = mapCodeToStudyYear(moduleCode);
    if (mappedFromCode) {
        return mappedFromCode;
    }

    return 'Year 1';
};

const extractDependencies = (record, code, idToCodeMap = new Map()) => {
    const nestedRelations = findValuesByKey(record, 'relations');
    const nestedAdditional = findValuesByKey(record, 'additional');
    const nestedRequirements = findValuesByKey(record, 'requirements');
    const nestedRequisites = findValuesByKey(record, 'requisites');
    const nestedIncompatibilities = findValuesByKey(record, 'incompatibilities');
    const nestedCorequisites = findValuesByKey(record, 'corequisites');

    const relationContainers = [
        record.__moduleEntry,
        record.__moduleEntry?.offerings,
        record.relations,
        ...nestedRelations,
        ...nestedAdditional,
        ...nestedRequirements,
        ...nestedRequisites,
        ...nestedIncompatibilities,
        ...nestedCorequisites,
        record.relationships,
        record.prerequisites,
        record.corequisites,
        record.incompatibilities,
        record.requirements,
        record.constraints,
        record.dependencies
    ];

    const relations = new Set();
    const prerequisites = new Set();
    const corequisites = new Set();
    const incompatibilities = new Set();

    const assignCodes = (codes, category) => {
        const target =
            category === 'corequisites'
                ? corequisites
                : category === 'incompatibilities'
                ? incompatibilities
                : prerequisites;

        for (const match of codes) {
            if (match !== code) {
                target.add(match);
            }
        }
    };

    const consumeValue = (value, forcedCategory = '', inRelationContext = false) => {
        if (value === null || value === undefined) {
            return;
        }

        if (typeof value === 'string') {
            const normalized = value.replace(/\s+/g, ' ').trim();
            if (!normalized) {
                return;
            }

            const codes = extractModuleCodes(normalized, idToCodeMap);
            const detectedCategory = forcedCategory || detectRelationCategory(normalized);
            const hasInformativeText = /\s|:|\(|\)/.test(normalized);
            const effectiveCategory = detectedCategory;

            if (!effectiveCategory) {
                return;
            }

            if (codes.length > 0 || hasInformativeText) {
                relations.add(normalized);
            }

            assignCodes(codes, effectiveCategory);
            return;
        }

        if (typeof value !== 'object') {
            return;
        }

        if (Array.isArray(value)) {
            for (const item of value) {
                consumeValue(item, forcedCategory, inRelationContext);
            }
            return;
        }

        const obj = value;
        const metadataHint = firstNonEmptyString([
            obj.relationType,
            obj.relation,
            obj.kind,
            obj.type,
            obj.code,
            obj.externalId,
            obj.englishName,
            obj.name,
            obj.title
        ]);
        const objectCategory = forcedCategory || detectRelationCategory(metadataHint);

        if ('additional' in obj) {
            consumeValue(obj.additional, objectCategory, true);
        }

        if ('relations' in obj) {
            consumeValue(obj.relations, objectCategory, true);
        }

        for (const [key, child] of Object.entries(obj)) {
            if (key === 'additional' || key === 'relations') {
                continue;
            }

            const keyCategory = detectRelationCategory(key) || objectCategory;
            const childInRelationContext =
                inRelationContext || Boolean(keyCategory) || /(relation|requisite|dependenc|constraint)/i.test(key);
            consumeValue(child, keyCategory, childInRelationContext);
        }
    };

    for (const container of relationContainers) {
        consumeValue(container, '', true);
    }

    return {
        relations: [...relations].sort((a, b) => a.localeCompare(b)),
        prerequisites: [...prerequisites].sort((a, b) => a.localeCompare(b)),
        corequisites: [...corequisites].sort((a, b) => a.localeCompare(b)),
        incompatibilities: [...incompatibilities].sort((a, b) => a.localeCompare(b))
    };
};

const cleanRecord = (record, idToCodeMap = new Map()) => {
    const code = pickCode(record);
    if (!code) {
        return null;
    }

    const title = pickTitle(record);
    const credits = pickCredits(record);
    const term = pickTerm(record);
    const year = pickYear(record, code);
    const stage = mapCodeToStage(code);
    const dependencies = extractDependencies(record, code, idToCodeMap);

    return {
        code,
        title,
        credits: credits ?? 15,
        term,
        year,
        stage,
        prerequisites: dependencies.prerequisites,
        corequisites: dependencies.corequisites,
        incompatibilities: dependencies.incompatibilities,
        relations: dependencies.relations
    };
};

const writeModuleFiles = async (records, outputDir) => {
    await fs.mkdir(outputDir, { recursive: true });

    let written = 0;
    for (const record of records) {
        const filePath = path.join(outputDir, `${record.code}.json`);
        await fs.writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
        written += 1;
    }

    return written;
};

const addHeuristicPrerequisites = (records) => {
    // Create a map of last 3 digits -> [module codes]
    const codesByLastThree = new Map();
    
    for (const record of records) {
        const code = record.code;
        if (/^MTH[1-3MTHM]\d{3}/.test(code)) {
            const lastThree = code.slice(-3);
            if (!codesByLastThree.has(lastThree)) {
                codesByLastThree.set(lastThree, []);
            }
            codesByLastThree.get(lastThree).push(code);
        }
    }
    
    // For each Stage 2/3 module, check if a lower-stage module exists
    for (const record of records) {
        const code = record.code;
        const stage = record.stage;
        
        if (stage === 'Stage 2' || stage === 'Stage 3') {
            const lastThree = code.slice(-3);
            const relatedCodes = codesByLastThree.get(lastThree) || [];
            
            // Find modules with the same last 3 digits but earlier stage
            const stageNum = Number.parseInt(stage.slice(-1), 10);
            
            for (const relatedCode of relatedCodes) {
                if (relatedCode === code) continue;
                
                const relatedStageMatch = relatedCode.match(/^MTH([1-3])/);
                if (!relatedStageMatch) continue;
                
                const relatedStageNum = Number.parseInt(relatedStageMatch[1], 10);
                // Add as prerequisite if it's a lower stage
                if (relatedStageNum < stageNum && !record.prerequisites.includes(relatedCode)) {
                    record.prerequisites.push(relatedCode);
                }
            }
            
            // Sort prerequisites for consistency
            record.prerequisites.sort((a, b) => a.localeCompare(b));
        }
    }
    
    return records;
};

const main = async () => {
    const args = parseArgs(process.argv.slice(2));

    const rawText = await fs.readFile(args.input, 'utf8');
    const parsed = JSON.parse(rawText);
    const selectedRoot = args.path ? getPath(parsed, args.path) : autoDetectRoot(parsed);

    if (selectedRoot === undefined) {
        throw new Error(`Path "${args.path}" not found in input JSON.`);
    }

    const candidates =
        Array.isArray(parsed?.data?.groups) && (args.path === '' || args.path === 'data.groups')
            ? extractStructureModuleRecords(parsed.data.groups)
            : gatherCandidateRecords(selectedRoot);
    if (candidates.length === 0) {
        throw new Error(
            'No module records found in this payload. This file appears to be a TimeEdit reference catalogue, not module entities. Use the endpoint response that contains module objects (with code, englishName, credits, and relations).'
        );
    }

    const idToCodeMap = new Map();
    for (const candidate of candidates) {
        const code = pickCode(candidate);
        if (!code) {
            continue;
        }

        const possibleIds = [candidate.uid, candidate.id, candidate.__moduleEntry?.uid, candidate.__moduleEntry?.module?.uid];
        for (const rawId of possibleIds) {
            if (typeof rawId === 'string' && rawId.trim()) {
                idToCodeMap.set(rawId.toLowerCase(), code);
            }
        }
    }

    const dedupedByCode = new Map();
    for (const candidate of candidates) {
        const cleaned = cleanRecord(candidate, idToCodeMap);
        if (!cleaned) {
            continue;
        }

        if (!dedupedByCode.has(cleaned.code)) {
            dedupedByCode.set(cleaned.code, cleaned);
            continue;
        }

        const existing = dedupedByCode.get(cleaned.code);
        const existingScore =
            Number(Boolean(existing.title)) +
            Number(existing.credits !== null) +
            Number(Boolean(existing.year)) +
            existing.prerequisites.length +
            existing.corequisites.length +
            existing.incompatibilities.length +
            existing.relations.length;
        const newScore =
            Number(Boolean(cleaned.title)) +
            Number(cleaned.credits !== null) +
            Number(Boolean(cleaned.year)) +
            cleaned.prerequisites.length +
            cleaned.corequisites.length +
            cleaned.incompatibilities.length +
            cleaned.relations.length;

        if (newScore >= existingScore) {
            dedupedByCode.set(cleaned.code, cleaned);
        }
    }

    const cleanedRecords = [...dedupedByCode.values()].sort((a, b) => a.code.localeCompare(b.code));
    const withHeuristics = addHeuristicPrerequisites(cleanedRecords);
    const written = await writeModuleFiles(withHeuristics, args.output);

    console.log(`Wrote ${written} module files to ${args.output}`);
};

main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});