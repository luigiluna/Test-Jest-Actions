import { formatThresholdResults } from '../../src/format/formatThresholdResults';
import { ThresholdType } from '../../src/typings/ThresholdResult';

describe('formatThresholdResults', () => {
    it('should format changed lines threshold failures with specific message', () => {
        const results = [
            {
                path: 'src/example.ts',
                expected: 80,
                received: 65,
                type: ThresholdType.LINES,
                isChangedLinesThreshold: true,
            },
        ];

        const formatted = formatThresholdResults(results);
        
        expect(formatted).toContain('Coverage for changed lines not met');
        expect(formatted).toContain('src/example.ts');
        expect(formatted).toContain('expected >=80%');
        expect(formatted).toContain('but got 65%');
        expect(formatted).toContain('(only considering new/modified lines)');
    });

    it('should format regular threshold failures with original message', () => {
        const results = [
            {
                path: 'src/example.ts',
                expected: 80,
                received: 65,
                type: ThresholdType.LINES,
                isChangedLinesThreshold: false,
            },
        ];

        const formatted = formatThresholdResults(results);
        
        expect(formatted).toContain('Lines coverage not met');
        expect(formatted).toContain('src/example.ts');
        expect(formatted).toContain('expected >=80%');
        expect(formatted).toContain('but got 65%');
        expect(formatted).not.toContain('(only considering new/modified lines)');
    });

    it('should handle mixed threshold failures', () => {
        const results = [
            {
                path: 'src/new-code.ts',
                expected: 80,
                received: 65,
                type: ThresholdType.LINES,
                isChangedLinesThreshold: true,
            },
            {
                path: 'src/overall.ts',
                expected: 70,
                received: 55,
                type: ThresholdType.STATEMENTS,
                isChangedLinesThreshold: false,
            },
        ];

        const formatted = formatThresholdResults(results);
        
        // Should contain both messages
        expect(formatted).toContain('Coverage for changed lines not met');
        expect(formatted).toContain('Statements coverage not met');
        expect(formatted).toContain('(only considering new/modified lines)');
    });
});
