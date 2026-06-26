export function calculateSchoolStats(data) {
    if (!data || data.length === 0) return {};

    // Helper to get average score
    const getAvg = (arr) => {
        if (!arr.length) return 0;
        return (arr.reduce((acc, curr) => acc + curr.score, 0) / arr.length).toFixed(2);
    };

    // Helper to get % EXS+ (Score >= 3)
    const getExs = (arr) => {
        if (!arr.length) return 0;
        const passed = arr.filter(d => d.score >= 3).length;
        return ((passed / arr.length) * 100).toFixed(1) + '%';
    };

    // 1. Overall Stats
    const stats = {
        totalStudents: new Set(data.map(d => d.name)).size,
        overallAvgScore: getAvg(data),
        overallExsPlus: getExs(data),
        byYearGroup: {},
        bySubject: {},
        gaps: {}
    };

    // 2. Year Group Breakdowns
    const yearGroups = [...new Set(data.map(d => d.yearGroup))];
    yearGroups.forEach(yg => {
        const d = data.filter(row => row.yearGroup === yg);
        stats.byYearGroup[yg] = {
            count: new Set(d.map(r => r.name)).size,
            avgScore: getAvg(d),
            exsPlus: getExs(d),
            subjects: {}
        };

        // Subject breakdown within Year Group
        const subjects = [...new Set(d.map(r => r.subject))];
        subjects.forEach(subj => {
            const sd = d.filter(r => r.subject === subj);
            stats.byYearGroup[yg].subjects[subj] = {
                avg: getAvg(sd),
                exs: getExs(sd)
            };
        });
    });

    // 3. Subject Summaries (Across all years)
    const allSubjects = [...new Set(data.map(r => r.subject))];
    allSubjects.forEach(subj => {
        const d = data.filter(r => r.subject === subj);
        stats.bySubject[subj] = {
            avg: getAvg(d),
            exs: getExs(d)
        };
    });

    // 4. Demographic Gaps (High Level)
    const calcGap = (field, val1, val2) => {
        const d1 = data.filter(d => d[field] === val1);
        const d2 = data.filter(d => d[field] === val2);
        return {
            [val1]: { avg: getAvg(d1), exs: getExs(d1) },
            [val2]: { avg: getAvg(d2), exs: getExs(d2) }
        };
    };

    stats.gaps = {
        pupilPremium: calcGap('pupilPremium', 'Yes', 'No'),
        sen: calcGap('sEN', 'Yes', 'No'),
        sex: calcGap('sex', 'M', 'F')
    };

    return stats;
}
