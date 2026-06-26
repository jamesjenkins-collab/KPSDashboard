import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, Legend } from 'recharts';
import { Users, TrendingUp, Target, AlertCircle, ArrowRight } from 'lucide-react';
import { StudentListModal } from '../ui/StudentListModal';

import { SCORE_LEVELS, getScoreLabel } from '../../lib/scoreUtils';

// Helper to get numeric value
const getScoreValue = (grade) => {
    if (!grade) return 0;
    const g = String(grade).trim().toUpperCase();
    // Check direct match in SCORE_LEVELS first (e.g. EXS, WTS)
    // We need to normalize first because keys might be different? 
    // Actually scoreUtils exports normalizeGrade locally but not globally?
    // Let's rely on matching keys or manual mapping if needed. 
    // SCORE_LEVELS keys: 'PF', 'WBYG', 'WTS', 'EXS'
    // normalize logic in utils: PYB->WBYG, etc.

    if (g === 'EXS') return SCORE_LEVELS['EXS'].value; // 3
    if (g === 'GDS') return 4; // Not in SCORE_LEVELS? User said GDS exists.
    // If not found, maybe handle explicitly
    if (g.startsWith('GDS')) return 4; // Assume GDS > EXS
    if (g === 'WTS') return SCORE_LEVELS['WTS'].value; // 2
    if (g === 'WBYG' || g === 'PYB') return SCORE_LEVELS['WBYG'].value; // 1
    if (g === 'PF') return SCORE_LEVELS['PF'].value; // 0

    return 0;
};

export function SubjectDeepDive({ data, fullData, allSubjects, filters = {} }) {
    // Determine subject/term from global filters or defaults
    // Default to 'Reading' if no filter selected, or the first selected subject
    const selectedSubject = filters.subject && filters.subject.length > 0 ? filters.subject[0] : (allSubjects[0] || 'Reading');

    // Default to 'Autumn' (or first available term?) if no filter selected
    // Note: The global filter might send full strings like "Autumn Term 1". 
    // We should probably rely on exact match if filtered.
    // However, the previous logic used partial matching "Autumn". 
    // If filters.term is present, use it. If not, maybe 'Autumn'?
    // Let's assume filters.term[0] is the primary one if present.
    const selectedTerm = filters.term && filters.term.length > 0 ? filters.term[0] : 'Autumn';

    const [comparisonSubject, setComparisonSubject] = useState('None');
    const [modalConfig, setModalConfig] = useState(null);

    // Constants for colors
    const PRIMARY_COLOR = "#4f46e5";
    const COMPARISON_COLOR = "#ea580c";

    // Helper to get subject data
    const getSubjectData = (subj) => {
        return data.filter(d => d.subject === subj && d.term && d.term.includes(selectedTerm));
    };

    const subjectData = useMemo(() => getSubjectData(selectedSubject), [data, selectedSubject, selectedTerm]);
    const comparisonData = useMemo(() =>
        comparisonSubject === 'None' ? [] : getSubjectData(comparisonSubject),
        [data, comparisonSubject, selectedTerm]
    );

    // Calculate Stats for a given dataset
    const calculateStats = (dataset, subjectName) => {
        if (!dataset.length) return null;

        const total = dataset.length;
        // EXS is value 3. GDS (if 4) is also >= 3.
        const atEXSPlus = dataset.filter(d => getScoreValue(d.score) >= 3).length;

        // Use fullData if available, otherwise fallback to data
        const targetSource = fullData || data;

        // Calculate Below Target
        // Logic: Compare current score value vs Target score value
        const belowTargetList = dataset.filter(d => {
            const targetRow = targetSource.find(r =>
                r.name === d.name &&
                r.subject === subjectName &&
                r.term === 'Actual Target (2025/2026)'
            );
            return targetRow && getScoreValue(d.score) < getScoreValue(targetRow.score);
        }).map(d => {
            const targetRow = targetSource.find(r => r.name === d.name && r.subject === subjectName && r.term === 'Actual Target (2025/2026)');
            const tScore = getScoreValue(targetRow?.score);
            const cScore = getScoreValue(d.score);
            return { ...d, targetScore: targetRow?.score, gap: tScore - cScore };
        });

        const totalScoreVal = dataset.reduce((acc, curr) => acc + getScoreValue(curr.score), 0);
        const avgScore = (totalScoreVal / total).toFixed(1);

        return {
            total,
            atEXSPlus,
            percentageEXSPlus: ((atEXSPlus / total) * 100).toFixed(1),
            belowTarget: belowTargetList.length,
            percentageBelowTarget: ((belowTargetList.length / total) * 100).toFixed(1),
            avgScore,
            belowTargetList
        };
    };

    const primaryStats = useMemo(() => calculateStats(subjectData, selectedSubject), [subjectData, selectedSubject]);
    const compareStats = useMemo(() =>
        comparisonSubject !== 'None' ? calculateStats(comparisonData, comparisonSubject) : null,
        [comparisonData, comparisonSubject]
    );

    // Class Performance Groups
    const chartData = useMemo(() => {
        if (!subjectData.length) return [];

        // Detect if we should group by Year or By Class
        // Robustly determine Year Group for each student
        const processedData = subjectData.map(d => {
            let yg = d.yearGroup;
            if (!yg && d.registrationForm) {
                const match = String(d.registrationForm).match(/(?:^|y)(\d+)/i);
                if (match) yg = `Year ${match[1]}`;
            }
            return { ...d, _derivedYearGroup: yg };
        });

        const uniqueYears = [...new Set(processedData.map(d => d._derivedYearGroup).filter(Boolean))];

        // If we have more than 1 year group, collate by Year.
        // If we have only 1 (or 0) year groups filtered, break it down by Class.
        const isCollatedView = uniqueYears.length > 1;

        // Key to group by
        const groupKey = isCollatedView ? '_derivedYearGroup' : 'registrationForm';

        // Get unique groups
        const allGroups = [...new Set([
            ...processedData.map(d => d[groupKey] || 'Unknown'),
            // Comparison data might need same processing? 
            // Ideally yes, but let's assume if main data is collated, we collate comparison too.
            // But comparison data needs `_derivedYearGroup` too.
        ])].filter(Boolean);

        // Helper to get derived group value from a student object
        const getGroupValue = (d) => {
            if (isCollatedView) {
                let yg = d.yearGroup;
                if (!yg && d.registrationForm) {
                    const match = String(d.registrationForm).match(/(?:^|y)(\d+)/i);
                    if (match) yg = `Year ${match[1]}`;
                }
                return yg;
            }
            return d.registrationForm;
        };

        // Add comparison groups
        comparisonData.forEach(d => {
            const g = getGroupValue(d);
            if (g && !allGroups.includes(g)) allGroups.push(g);
        });

        const processGroup = (groupName, dataset) => {
            // Filter using our derived logic
            const groupStudents = dataset.filter(d => {
                const g = getGroupValue(d);
                return (g || 'Unknown') === groupName;
            });

            const total = groupStudents.length;
            if (total === 0) return { percentage: 0, notOnTrack: [] };

            const exsPlus = groupStudents.filter(d => getScoreValue(d.score) >= 3).length;
            return {
                percentage: parseFloat(((exsPlus / total) * 100).toFixed(1)),
                notOnTrack: groupStudents.filter(s => getScoreValue(s.score) < 3)
            };
        };

        const result = allGroups.map(group => {
            const primary = processGroup(group, subjectData);
            const secondary = comparisonSubject !== 'None' ? processGroup(group, comparisonData) : null;

            return {
                name: group,
                value: primary.percentage,
                notOnTrack: primary.notOnTrack,
                // Comparison data
                compareValue: secondary ? secondary.percentage : undefined,
                compareNotOnTrack: secondary ? secondary.notOnTrack : undefined,
                isCollated: isCollatedView // Pass this flag for formatting
            };
        });

        // Sort
        return result.sort((a, b) => {
            // Helper to parse numbering
            const getNum = (str) => {
                const s = String(str);
                if (s.toLowerCase().includes('nursery')) return -2;
                if (s.toLowerCase().includes('rec')) return -1;
                return parseInt(s.replace(/\D/g, '')) || 0;
            };
            return getNum(a.name) - getNum(b.name);
        });

    }, [subjectData, comparisonData, comparisonSubject]);


    const handleBarClick = (data, index, type = 'primary') => {
        // data is the chart payload item (e.g., { name: "Year 1", value: 70, notOnTrack: [...] })

        let studentsToList = [];
        let subjName = selectedSubject;

        if (type === 'compare') {
            studentsToList = data.compareNotOnTrack || [];
            subjName = comparisonSubject;
        } else {
            studentsToList = data.notOnTrack || [];
        }

        if (studentsToList.length > 0) {
            setModalConfig({
                title: `Students Not on Track - ${data.name} (${subjName})`,
                subtitle: `${studentsToList.length} students below EXS (Score < 3)`,
                students: studentsToList,
                type: 'simple'
            });
        }
    };

    const handleBelowTargetClick = (isCompare = false) => {
        const statsObj = isCompare ? compareStats : primaryStats;
        const subj = isCompare ? comparisonSubject : selectedSubject;

        if (statsObj && statsObj.belowTargetList.length > 0) {
            setModalConfig({
                title: `Students Below Target - ${subj}`,
                subtitle: `Comparing vs Actual Target (2025/2026)`,
                students: statsObj.belowTargetList,
                type: 'gap'
            });
        }
    };

    // Demographic Gaps Calculation (Simplified for dual view or single)
    // For now, let's keep it simple: Show Primary Subject Gaps. 
    // If comparing, maybe show a simplified table.

    if (!primaryStats) return <div className="p-6">Select a subject to view data</div>;

    const ComparisonBadge = ({ val1, val2, suffix = '', inverse = false }) => {
        if (val2 === undefined) return null;
        const diff = (val1 - val2).toFixed(1);
        const isPositive = inverse ? diff < 0 : diff >= 0;
        return (
            <div className={`text-xs px-2 py-1 rounded inline-flex items-center gap-1 mt-1 ${diff == 0 ? 'bg-gray-100 text-gray-600' :
                isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                {diff > 0 ? '+' : ''}{diff}{suffix} vs {comparisonSubject}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header / Controls */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Subject Deep Dive: {selectedSubject}</h2>
                    <p className="text-sm text-gray-500">Analysis for {selectedTerm}</p>
                </div>
                <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        <span className="text-gray-500 font-medium px-2 py-1 text-sm">Compare vs:</span>
                        <select
                            value={comparisonSubject}
                            onChange={(e) => setComparisonSubject(e.target.value)}
                            className={`px-4 py-2 border rounded-md text-sm font-medium shadow-sm transition-colors cursor-pointer ${comparisonSubject !== 'None'
                                ? 'bg-white border-orange-200 text-orange-700 font-bold'
                                : 'bg-transparent border-transparent text-gray-500 hover:bg-white hover:border-gray-200'
                                }`}
                        >
                            <option value="None">None</option>
                            {allSubjects.filter(s => s !== selectedSubject).map(s =>
                                <option key={s} value={s}>{s}</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* EXS+ Card - Kept as requested (implicitly, as others were removed) */}
                {/* Wait, user said remove Avg Score, Below Target, Cohort Size. 
                    This leaves ONLY the At EXS+ card. 
                    Let's span it or keep it standard size? Standard size is fine. 
                 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <p className="text-sm font-medium text-gray-500">At EXS+</p>
                    <div className="flex justify-between items-end mt-2">
                        <h3 className="text-3xl font-bold text-green-600">{primaryStats.percentageEXSPlus}%</h3>
                        {compareStats && <h3 className="text-xl font-bold text-orange-600">{compareStats.percentageEXSPlus}%</h3>}
                    </div>
                    {compareStats && <ComparisonBadge val1={primaryStats.percentageEXSPlus} val2={compareStats.percentageEXSPlus} suffix="%" />}
                    {!compareStats && <p className="text-xs text-green-600 mt-2">{primaryStats.atEXSPlus} students</p>}
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Compare Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">
                        Performance by Group (% EXS+)
                        <span className="text-sm font-normal text-gray-500 ml-2">
                            (Click bar to see students)
                        </span>
                    </h3>
                    <div className="h-96">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                style={{ cursor: 'pointer' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tickFormatter={(val) => {
                                        // If it's a full "Year X", keep it or shorten to "Y X"
                                        if (val.toString().toLowerCase().includes('year')) return val; // "Year 1" -> "Year 1"
                                        // If it's a class code like "Y1S", remove the "Y" -> "1S"
                                        return val.toString().replace(/^Y(?=\d)/i, '');
                                    }}
                                />
                                <YAxis type="number" domain={[0, 100]} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend verticalAlign="top" height={36} />

                                <Bar
                                    name={selectedSubject}
                                    dataKey="value"
                                    fill={PRIMARY_COLOR}
                                    radius={[4, 4, 0, 0]}
                                    onClick={(data) => handleBarClick(data, 0, 'primary')}
                                >
                                    <LabelList dataKey="value" position="top" formatter={(val) => `${val}%`} style={{ fill: '#666', fontSize: '11px', fontWeight: 'bold' }} />
                                </Bar>

                                {comparisonSubject !== 'None' && (
                                    <Bar
                                        name={comparisonSubject}
                                        dataKey="compareValue"
                                        fill={COMPARISON_COLOR}
                                        radius={[4, 4, 0, 0]}
                                        onClick={(data) => handleBarClick(data, 0, 'compare')}
                                    >
                                        <LabelList dataKey="compareValue" position="top" formatter={(val) => `${val}%`} style={{ fill: '#666', fontSize: '11px', fontWeight: 'bold' }} />
                                    </Bar>
                                )}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Demographic Matrix (Simplified to show Primary Subject) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Demographic Gaps ({selectedSubject})</h3>
                    {/* ... (Existing logic for demographics, utilizing a helper function) */}
                    <DemographicsTable subjectData={subjectData} />
                </div>
            </div>

            {/* Modal */}
            {modalConfig && (
                <StudentListModal
                    {...modalConfig}
                    onClose={() => setModalConfig(null)}
                />
            )}
        </div>
    );
}

// Extracted Demographics Table for cleanliness
function DemographicsTable({ subjectData }) {
    const demographics = useMemo(() => {
        const calculateGap = (groupData, key, val1, val2) => {
            const g1 = groupData.filter(d => d[key] === val1);
            const g2 = groupData.filter(d => d[key] === val2);
            const p1 = g1.length ? (g1.filter(d => getScoreValue(d.score) >= 3).length / g1.length) * 100 : 0;
            const p2 = g2.length ? (g2.filter(d => getScoreValue(d.score) >= 3).length / g2.length) * 100 : 0;
            return {
                group1: { name: val1, total: g1.length, percentage: p1.toFixed(1) },
                group2: { name: val2, total: g2.length, percentage: p2.toFixed(1) },
                gap: (p1 - p2).toFixed(1)
            };
        };
        return [
            { name: 'Pupil Premium', ...calculateGap(subjectData, 'pupilPremium', 'Yes', 'No') },
            { name: 'SEN', ...calculateGap(subjectData, 'sen', 'Yes', 'No') },
            { name: 'EAL', ...calculateGap(subjectData, 'eal', 'Yes', 'No') },
            { name: 'Sex', ...calculateGap(subjectData, 'sex', 'M', 'F') },
        ];
    }, [subjectData]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3">Group</th>
                        <th className="px-4 py-3 text-center">Gap</th>
                        <th className="px-4 py-3 text-right">Compare</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {demographics.map((demo) => (
                        <tr key={demo.name} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium text-gray-900">{demo.name}</td>
                            <td className="px-4 py-3 text-center">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${parseFloat(demo.gap) < -10 ? 'bg-red-100 text-red-700' :
                                    parseFloat(demo.gap) < 0 ? 'bg-orange-100 text-orange-700' :
                                        'bg-green-100 text-green-700'
                                    }`}>
                                    {demo.gap}%
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-gray-500">
                                {demo.group1.name} ({demo.group1.percentage}%)
                                <span className="mx-1 text-gray-300">vs</span>
                                {demo.group2.name} ({demo.group2.percentage}%)
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
