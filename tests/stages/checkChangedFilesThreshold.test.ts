import { checkChangedFilesThreshold } from '../../src/stages/checkChangedFilesThreshold';
import { createDataCollector } from '../../src/utils/DataCollector';
import { ThresholdType } from '../../src/typings/ThresholdResult';
import { FailReason } from '../../src/typings/Report';

describe('checkChangedFilesThreshold', () => {
    const mockReport = {
        coverageMap: {
            'src/example.ts': {
                statementMap: {
                    0: { start: { line: 1 }, end: { line: 1 } },
                    1: { start: { line: 2 }, end: { line: 2 } },
                    2: { start: { line: 3 }, end: { line: 3 } },
                    3: { start: { line: 5 }, end: { line: 5 } },
                },
                s: {
                    0: 1, // linha 1 coberta
                    1: 0, // linha 2 não coberta
                    2: 1, // linha 3 coberta
                    3: 0, // linha 5 não coberta
                },
                fnMap: {},
                f: {},
                branchMap: {},
                b: {},
                path: 'src/example.ts',
            },
        },
        success: true,
        numFailedTestSuites: 0,
        numPassedTestSuites: 1,
        numPendingTestSuites: 0,
        numTotalTestSuites: 1,
        numFailedTests: 0,
        numPassedTests: 3,
        numPendingTests: 0,
        numTotalTests: 3,
        numRuntimeErrorTestSuites: 0,
        numTodoTests: 0,
        wasInterrupted: false,
        openHandles: [],
        snapshot: {
            added: 0,
            didUpdate: false,
            failure: false,
            filesAdded: 0,
            filesRemoved: 0,
            filesRemovedList: [],
            filesUnmatched: 0,
            filesUpdated: 0,
            matched: 0,
            total: 0,
            unchecked: 0,
            uncheckedKeysByFile: [],
            unmatched: 0,
            updated: 0,
        },
        startTime: 0,
        testResults: [],
    };

    const patchWithAddedLines = `
diff --git a/src/example.ts b/src/example.ts
index abc123..def456 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -1,3 +1,5 @@
 line 1
+line 2
 line 3
+line 5
 line 6
`;

    it('should pass when changed lines coverage is above threshold', () => {
        const dataCollector = createDataCollector();
        const results = checkChangedFilesThreshold(
            mockReport,
            50, // 50% threshold
            patchWithAddedLines,
            undefined,
            dataCollector
        );

        // 1 coberta de 2 adicionadas = 50%
        expect(results).toHaveLength(0);
        expect(dataCollector.get().errors).not.toContain(FailReason.UNDER_THRESHOLD);
    });

    it('should fail when changed lines coverage is below threshold', () => {
        const dataCollector = createDataCollector();
        const results = checkChangedFilesThreshold(
            mockReport,
            80, // 80% threshold
            patchWithAddedLines,
            undefined,
            dataCollector
        );

        // 1 coberta de 2 adicionadas = 50% < 80%
        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            path: 'src/example.ts',
            expected: 80,
            received: 50,
            type: ThresholdType.LINES,
            isChangedLinesThreshold: true,
        });
        expect(dataCollector.get().errors).toContain(FailReason.UNDER_THRESHOLD);
    });

    it('should handle files with no changed lines', () => {
        const emptyPatch = `
diff --git a/other-file.ts b/other-file.ts
index abc123..def456 100644
--- a/other-file.ts
+++ b/other-file.ts
@@ -1,3 +1,3 @@
 unchanged line 1
 unchanged line 2
 unchanged line 3
`;

        const dataCollector = createDataCollector();
        const results = checkChangedFilesThreshold(
            mockReport,
            80,
            emptyPatch,
            undefined,
            dataCollector
        );

        expect(results).toHaveLength(0);
        expect(dataCollector.get().errors).not.toContain(FailReason.UNDER_THRESHOLD);
    });

    it('should handle files not found in coverage map', () => {
        const patchWithNewFile = `
diff --git a/src/new-file.ts b/src/new-file.ts
index abc123..def456 100644
--- a/src/new-file.ts
+++ b/src/new-file.ts
@@ -1,3 +1,5 @@
 line 1
+line 2
 line 3
`;

        const dataCollector = createDataCollector();
        const results = checkChangedFilesThreshold(
            mockReport,
            80,
            patchWithNewFile,
            undefined,
            dataCollector
        );

        expect(results).toHaveLength(0);
        expect(dataCollector.get().errors).not.toContain(FailReason.UNDER_THRESHOLD);
    });
});
