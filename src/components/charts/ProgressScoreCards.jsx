import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { calculateProgress, getYearGroup } from '../../lib/scoreUtils';

const SUBJECTS = ['Reading', 'Writing', 'Maths'];

// Helper to determine rank - DEPRECATED in favor of calculateProgress
// const getRank = (score) => { ... }

export function ProgressScoreCards({ currentData, historicalData, onDrillDown }) {

    const progressStats = useMemo(() => {
        if (!currentData.length || !historicalData.length) return {};

        const stats = {};

        // Helper to get latest entry per student for a subject
        const getLatestByUPN = (data, subject) => {
            const map = {};
            data.forEach(d => {
                // Normalize subject check
                if (d.subject === subject) {
                    map[d.upn] = d;
                }
            });
            return map;
        };

        SUBJECTS.forEach(subject => {
            const currentMap = getLatestByUPN(currentData, subject);
            const historicalMap = getLatestByUPN(historicalData, subject);

            const better = [];
            const expected = [];
            const less = [];
            let total = 0;

            Object.keys(currentMap).forEach(upn => {
                const currentRecord = currentMap[upn];
                const historicalRecord = historicalMap[upn];

                if (historicalRecord) {
                    // Determine Context
                    const currentYearGroup = getYearGroup(currentRecord.registrationForm);

                    // Determine Year Gap
                    // Historical Data "24/25" -> End Year 25.
                    // Ideally we should know Current Year (e.g. 26 for 25/26).
                    // For now, let's derive it from the historical record + 1 if we assume it's one year gap, 
                    // OR try to parse it. 
                    // BETTER: Use User's example logic directly.
                    // If currentRecord has no year group, skip?
                    if (currentYearGroup === null) {
                        // Fallback?
                        return;
                    }

                    // Parse historical year
                    // historicalRecord.academicYear is "24/25" => 25.
                    // But if we don't have current academic year, we can't get strict gap.
                    // Let's assume for this specific dashboard, "Current" is 2025-2026 (End 26).
                    // And derive gap from that.
                    // TODO: Make this dynamic later.
                    const CURRENT_ACADEMIC_YEAR_END = 26;

                    let gap = 1;
                    if (historicalRecord.academicYear) {
                        // academicYear is strictly checked string "YY/YY" in googleSheets.js -> mapped to endYear int (25)
                        // Wait, googleSheets.js returns { academicYear: 25 } (int) now? 
                        // Yes: academicYear: endYear (int).
                        gap = CURRENT_ACADEMIC_YEAR_END - historicalRecord.academicYear;
                    }

                    const progressStatus = calculateProgress(currentRecord, historicalRecord, {
                        currentYearGroup,
                        yearGap: gap
                    });

                    // Assign Ranks for UI sorting/colors (still useful for table)
                    // We can map status to numeric rank
                    let currentRankVal = 0;
                    let historicalRankVal = 0;
                    // Just use the status string for grouping

                    const drillDownItem = {
                        name: currentRecord.name,
                        upn: currentRecord.upn,
                        currentGrade: currentRecord.score,
                        historicalGrade: historicalRecord.score,
                        currentRank: 0, // Placeholder if needed by table sorting
                        historicalRank: 0, // Placeholder
                        progressStatus
                    };

                    // Logic: Compare Ranks -> Use Status
                    if (progressStatus === 'Better than Expected') {
                        better.push(drillDownItem);
                    } else if (progressStatus === 'Less than Expected') {
                        less.push(drillDownItem);
                    } else {
                        expected.push(drillDownItem);
                    }
                    total++;
                }
            });

            if (total > 0) {
                stats[subject] = {
                    total,
                    better,
                    expected,
                    less,
                    betterPct: Math.round((better.length / total) * 100),
                    expectedPct: Math.round((expected.length / total) * 100),
                    lessPct: Math.round((less.length / total) * 100)
                };
            }
        });
        return stats;
    }, [currentData, historicalData]);

    if (Object.keys(progressStats).length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                <p className="text-gray-500">No matching student records found for progress comparison.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {SUBJECTS.map(subject => {
                const stat = progressStats[subject];
                if (!stat) return null;

                return (
                    <div key={subject} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">{subject}</h3>
                                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded-full border border-gray-200">
                                    {stat.total} Students
                                </span>
                            </div>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Better than Expected */}
                            <div
                                className="group cursor-pointer hover:bg-green-50 p-2 -mx-2 rounded-lg transition-colors"
                                onClick={() => onDrillDown && onDrillDown(subject, 'Better than Expected', stat.better)}
                            >
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Better than Expected</span>
                                    <span className="text-sm font-bold text-green-600">{stat.betterPct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stat.betterPct}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right group-hover:text-gray-600">
                                    {stat.better.length} students <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </div>
                            </div>

                            {/* Expected */}
                            <div
                                className="group cursor-pointer hover:bg-blue-50 p-2 -mx-2 rounded-lg transition-colors"
                                onClick={() => onDrillDown && onDrillDown(subject, 'Expected Progress', stat.expected)}
                            >
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Expected Progress</span>
                                    <span className="text-sm font-bold text-blue-600">{stat.expectedPct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stat.expectedPct}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right group-hover:text-gray-600">
                                    {stat.expected.length} students <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </div>
                            </div>

                            {/* Less than Expected */}
                            <div
                                className="group cursor-pointer hover:bg-orange-50 p-2 -mx-2 rounded-lg transition-colors"
                                onClick={() => onDrillDown && onDrillDown(subject, 'Less than Expected', stat.less)}
                            >
                                <div className="flex justify-between items-end mb-1">
                                    <span className="text-sm font-medium text-gray-600 group-hover:text-gray-900">Less than Expected</span>
                                    <span className="text-sm font-bold text-orange-600">{stat.lessPct}%</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stat.lessPct}%` }}></div>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 text-right group-hover:text-gray-600">
                                    {stat.less.length} students <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
