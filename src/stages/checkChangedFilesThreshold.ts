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
    const addedLines = indexAddedLines(patchContent);
    const totalResults: ThresholdResult[] = [];

    // Para cada arquivo que teve linhas modificadas
    Object.entries(addedLines).forEach(([filePath, lineNumbers]) => {
        if (!lineNumbers || lineNumbers.length === 0) return;

        // Encontrar o mapeamento de coverage para este arquivo
        const fullPath = Object.keys(report.coverageMap).find(path => 
            path.endsWith(filePath) || path.includes(filePath)
        );

        if (!fullPath || !report.coverageMap[fullPath]) return;

        const fileCoverage = report.coverageMap[fullPath];
        const normalizedFileCoverage = 'statementMap' in fileCoverage 
            ? fileCoverage 
            : fileCoverage.data;

        // Calcular coverage apenas para as linhas modificadas
        const changedLinesCoverage = calculateChangedLinesCoverage(
            normalizedFileCoverage,
            lineNumbers
        );

        if (changedLinesCoverage.total === 0) return;

        const coveragePercent = getPercents(
            changedLinesCoverage.covered,
            changedLinesCoverage.total
        );

        if (coveragePercent < threshold) {
            totalResults.push({
                path: filePath,
                expected: threshold,
                received: coveragePercent,
                type: ThresholdType.LINES,
                isChangedLinesThreshold: true,
            });
        }
    });

    if (totalResults.length > 0) {
        dataCollector.add(FailReason.UNDER_THRESHOLD);
    }

    return totalResults;
};

function indexAddedLines(patchContent: string): LineIndex {
    const patch = parseDiff(patchContent);
    const addedLines: { [key: string]: number[] } = {};
    
    for (const file of patch) {
        if (file.to) {
            addedLines[file.to] = [];
            for (const chunk of file.chunks) {
                for (const change of chunk.changes) {
                    if (change.type === 'add') {
                        addedLines[file.to].push(change.ln);
                    }
                }
            }
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
