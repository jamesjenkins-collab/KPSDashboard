// UK National Curriculum Assessment Levels
export const SCORE_LEVELS = {
    'PF': { code: 'PF', name: 'Lowest/Pre-foundational', color: '#ef4444', value: 0 },
    'WBYG': { code: 'WBYG', name: 'Working Below Year Group', color: '#f97316', value: 1 },
    'WTS': { code: 'WTS', name: 'Working Towards', color: '#f59e0b', value: 2 },
    'EXS': { code: 'EXS', name: 'Expected Standard', color: '#10b981', value: 3 }
};

/**
 * Normalizes grade codes from spreadsheet to match application keys
 */
const normalizeGrade = (grade) => {
    if (!grade) return null;
    const g = grade.toString().trim().toUpperCase();
    if (g === 'PF' || g === 'PF ') return 'PF';
    if (g === 'WBYG' || g === 'PYB') return 'WBYG';
    if (g === 'WTS') return 'WTS';
    if (g === 'EXS') return 'EXS';
    return g;
};

export const getScoreLabel = (score) => {
    const normalized = normalizeGrade(score);
    return SCORE_LEVELS[normalized]?.code || score;
};

export const getScoreName = (score) => {
    const normalized = normalizeGrade(score);
    return SCORE_LEVELS[normalized]?.name || 'Unknown';
};

export const getScoreColor = (score) => {
    const normalized = normalizeGrade(score);
    return SCORE_LEVELS[normalized]?.color || '#94a3b8';
};

export const calculateScoreDistribution = (data, subjectKey = 'score') => {
    const distribution = {};

    // Initialize with 0 for all levels
    Object.keys(SCORE_LEVELS).forEach(level => {
        distribution[level] = 0;
    });

    data.forEach(item => {
        const grade = normalizeGrade(item[subjectKey]);
        if (grade && distribution[grade] !== undefined) {
            distribution[grade]++;
        }
    });

    const totalCount = data.length;

    return Object.entries(distribution)
        .map(([key, count]) => ({
            name: SCORE_LEVELS[key].name,
            code: SCORE_LEVELS[key].code,
            value: count,
            color: SCORE_LEVELS[key].color,
            percentage: totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : 0,
            score: key
        }))
        .filter(item => item.value > 0);
};

export const calculatePercentageAtEXSPlus = (data, subjectKey = 'score') => {
    if (!data.length) return 0;

    const exsPlusCount = data.filter(item => {
        const grade = normalizeGrade(item[subjectKey]);
        return grade === 'EXS';
    }).length;

    return ((exsPlusCount / data.length) * 100).toFixed(1);
};

/**
 * Extracts numeric level from grade string (e.g., "EXS-4" -> 4)
 * Returns null if no number found.
 */
export const getNumericGrade = (grade) => {
    if (!grade) return null;
    const match = String(grade).match(/-(\d+)/);
    return match ? parseInt(match[1], 10) : null;
};

/**
 * Extracts year group number from registration form (e.g., "y4-ClassA" -> 4)
 * Returns null if invalid or EYFS (N/R handled as 0/-1 if needed, but here focused on Y1+)
 */
export const getYearGroup = (regForm) => {
    if (!regForm) return null;
    const str = String(regForm).toLowerCase();
    if (str.includes('rec') || str.includes('r')) return 0;
    if (str.includes('nur') || str.includes('n')) return -1;
    const match = str.match(/(?:^|y)(\d+)/); // Matches "y4", "4", "Year 4"
    return match ? parseInt(match[1], 10) : null;
};

/**
 * Calculates progress category comparing current vs historical performance
 * context: { currentYearGroup (int), yearGap (int) }
 */
export const calculateProgress = (currentRecord, historicalRecord, context) => {
    const { currentYearGroup, yearGap } = context;

    const currentScore = currentRecord.score; // e.g. "EXS" or "GDS"
    const historicalScore = historicalRecord.score; // e.g. "EXS-3"

    // 1. Determine Historical Expectations
    // Historical Year Group = Current YG - Gap
    // e.g. If Current Y4, Gap 1 -> Historical Y3.
    const historicalYearGroup = currentYearGroup - yearGap;

    // Helper to get Rank (3=Above/GDS, 2=Exp/EXS, 1=Below/WTS, 0=Lowest)
    const getContextualRank = (score, targetYear) => {
        if (!score) return 0;
        const s = score.toString().toUpperCase().trim();
        const level = getNumericGrade(s);

        // A. GDS is always Above (Rank 3)
        // (Unless we want to be strict that GDS-2 for Y3 is below? But usually GDS implies excellence)
        if (s.startsWith('GDS')) return 3;

        // B. EXS
        if (s.startsWith('EXS')) {
            // Check level if available
            if (level !== null) {
                if (level > targetYear) return 3; // EXS-4 in Y3 -> Better
                if (level < targetYear) return 1; // EXS-2 in Y3 -> Below (WTS)
                return 2; // EXS-3 in Y3 -> Expected
            }
            // If no level (just "EXS"), assume Expected for that year
            return 2;
        }

        // C. WTS -> Below (Rank 1)
        if (s.startsWith('WTS')) return 1;

        // D. WBYG / PF / EM -> Lowest (Rank 0)
        return 0;
    };

    // Calculate Ranks
    // For Current: Target is Current Year Group
    const currentRank = getContextualRank(currentScore, currentYearGroup);

    // For Historical: Target is Historical Year Group
    const historicalRank = getContextualRank(historicalScore, historicalYearGroup);

    // Compare
    if (currentRank > historicalRank) return 'Better than Expected';
    if (currentRank < historicalRank) {
        // Special Case: Historical GDS -> Current EXS is considered "Expected Progress"
        // (as GDS might not be awarded yet or is treated as valid maintenance)
        if (historicalRank === 3 && currentRank === 2) {
            return 'Expected Progress';
        }
        return 'Less than Expected';
    }
    return 'Expected Progress';
};
