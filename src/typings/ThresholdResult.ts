export enum ThresholdType {
    STATEMENTS = 'statements',
    FUNCTIONS = 'functions',
    BRANCHES = 'branches',
    LINES = 'lines',
}

export type ThresholdResult = {
    path: string;
    expected: number;
    received: number;
    type: ThresholdType;
    isChangedLinesThreshold?: boolean; // Flag para identificar threshold de linhas modificadas
};
