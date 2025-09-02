import { ThresholdResult } from '../typings/ThresholdResult';
import { i18n } from '../utils/i18n';

export const formatThresholdResults = (results: ThresholdResult[]): string => {
    return results
        .map(({ type, path, expected, received, isChangedLinesThreshold }) => {
            // Se for threshold de linhas modificadas, usar mensagem específica
            if (isChangedLinesThreshold) {
                return i18n('thresholdFailures.changedLines', {
                    path,
                    expected: Math.abs(expected),
                    coverage: received,
                });
            }
            
            // Comportamento original para outros tipos de threshold
            return i18n(`thresholdFailures.${expected < 0 ? 'ones' : 'percents'}`, {
                path,
                type: i18n(type),
                ltype: i18n(type).toLowerCase(),
                expected: Math.abs(expected),
                coverage: received,
            });
        })
        .join('\n');
};
