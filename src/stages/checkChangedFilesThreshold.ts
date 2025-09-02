import parseDiff from 'parse-diff';

import { JsonReport } from '../typings/JsonReport';
import { FailReason } from '../typings/Report';
import { ThresholdResult, ThresholdType } from '../typings/ThresholdResult';
import { DataCollector } from '../utils/DataCollector';
import { getPercents } from '../format/getPercents';

interface LineIndex {
    [key: string]: number[] | undefined;
}

export const checkChangedFilesThreshold = (
    report: JsonReport,
    threshold: number,
    patchContent: string,
    workingDirectory: string | undefined,
    dataCollector: DataCollector<unknown>
): ThresholdResult[] => {
    console.log('🎯 checkChangedFilesThreshold called with threshold:', threshold);
    console.log('📋 Patch content preview:', patchContent.substring(0, 200) + '...');
    
    const addedLines = indexAddedLines(patchContent);
    console.log('📝 Added lines found:', Object.keys(addedLines).length, 'files');
    console.log('📁 Files with changes:', Object.keys(addedLines));
    
    const totalResults: ThresholdResult[] = [];

    // Para cada arquivo que teve linhas modificadas
    Object.entries(addedLines).forEach(([filePath, lineNumbers]) => {
        if (!lineNumbers || lineNumbers.length === 0) return;

        console.log(`🔍 Processing file: ${filePath}, lines added: ${lineNumbers.length}`);

        // Encontrar o mapeamento de coverage para este arquivo
        const fullPath = Object.keys(report.coverageMap).find(path => 
            path.endsWith(filePath) || path.includes(filePath)
        );

        console.log(`🗂️ Looking for coverage of ${filePath}, found: ${fullPath}`);

        if (!fullPath || !report.coverageMap[fullPath]) {
            console.log(`❌ No coverage found for ${filePath}`);
            return;
        }

        const fileCoverage = report.coverageMap[fullPath];
        const normalizedFileCoverage = 'statementMap' in fileCoverage 
            ? fileCoverage 
            : fileCoverage.data;

        // Calcular coverage apenas para as linhas modificadas
        const changedLinesCoverage = calculateChangedLinesCoverage(
            normalizedFileCoverage,
            lineNumbers
        );

        console.log(`📊 ${filePath}: ${changedLinesCoverage.covered}/${changedLinesCoverage.total} statements covered`);

        if (changedLinesCoverage.total === 0) {
            console.log(`⚠️ No statements found in changed lines for ${filePath}`);
            return;
        }

        const coveragePercent = getPercents(
            changedLinesCoverage.covered,
            changedLinesCoverage.total
        );

        console.log(`📈 ${filePath}: ${coveragePercent}% coverage (threshold: ${threshold}%)`);

        if (coveragePercent < threshold) {
            console.log(`❌ THRESHOLD FAILED for ${filePath}: ${coveragePercent}% < ${threshold}%`);
            totalResults.push({
                path: filePath,
                expected: threshold,
                received: coveragePercent,
                type: ThresholdType.LINES,
                isChangedLinesThreshold: true, // Marcar como threshold de linhas modificadas
            });
        } else {
            console.log(`✅ THRESHOLD PASSED for ${filePath}: ${coveragePercent}% >= ${threshold}%`);
        }
    });

    console.log(`🎯 Total threshold failures: ${totalResults.length}`);

    if (totalResults.length > 0) {
        console.log('💥 Adding UNDER_THRESHOLD to dataCollector');
        dataCollector.add(FailReason.UNDER_THRESHOLD);
    }

    return totalResults;
};

function indexAddedLines(patchContent: string): LineIndex {
    console.log('🔍 Parsing patch content...');
    const patch = parseDiff(patchContent);
    console.log('📋 Parsed', patch.length, 'file changes');
    
    const addedLines: { [key: string]: number[] } = {};
    
    for (const file of patch) {
        if (file.to) {
            console.log(`📁 Processing file: ${file.to}`);
            addedLines[file.to] = [];
            for (const chunk of file.chunks) {
                for (const change of chunk.changes) {
                    if (change.type === 'add') {
                        addedLines[file.to].push(change.ln);
                    }
                }
            }
            console.log(`➕ Added ${addedLines[file.to].length} lines in ${file.to}`);
            console.log(`📝 Lines: [${addedLines[file.to].slice(0, 10).join(', ')}${addedLines[file.to].length > 10 ? '...' : ''}]`);
        }
    }
    return addedLines;
}

function calculateChangedLinesCoverage(
    fileCoverage: any,
    changedLines: number[]
): { covered: number; total: number } {
    let covered = 0;
    let total = 0;

    // Criar um Set para lookup rápido das linhas modificadas
    const changedLinesSet = new Set(changedLines);

    // Verificar coverage para statements nas linhas modificadas
    Object.entries(fileCoverage.statementMap).forEach(
        ([statementIndex, statementCoverage]: [string, any]) => {
            const startLine = statementCoverage.start.line;
            const endLine = statementCoverage.end?.line || startLine;

            // Verificar se alguma linha do statement está nas linhas modificadas
            for (let line = startLine; line <= endLine; line++) {
                if (changedLinesSet.has(line)) {
                    total++;
                    if (fileCoverage.s[+statementIndex] > 0) {
                        covered++;
                    }
                    break; // Contar apenas uma vez por statement
                }
            }
        }
    );

    return { covered, total };
}
