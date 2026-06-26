import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { calculatePercentageAtEXSPlus, getScoreLabel } from '../../lib/scoreUtils';

export function DemographicScoreCards({ data }) {
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [visibleDemographics, setVisibleDemographics] = useState({
        pupilPremium: true,
        sen: true,
        eal: true,
        summerBorn: true,
        inYearAdmission: true,
        sex: true
    });
    const totalStudents = new Set(data.map(d => d.name)).size;

    const toggleDemographic = (key) => {
        setVisibleDemographics(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const calculateGroupStats = (filterField, filterValue) => {
        const groupData = data.filter(item => {
            const fieldValue = item[filterField];
            return fieldValue && fieldValue.toLowerCase() === filterValue.toLowerCase();
        });

        const uniqueStudents = new Set(groupData.map(d => d.name)).size;
        const cohortPercentage = totalStudents > 0 ? ((uniqueStudents / totalStudents) * 100).toFixed(1) : 0;

        return {
            count: uniqueStudents,
            percentageAtEXS: calculatePercentageAtEXSPlus(groupData),
            cohortPercentage,
            data: groupData
        };
    };

    const getStudentsBelowEXS = (groupData) => {
        const belowEXS = groupData.filter(item => item.score < 3);
        const studentMap = {};
        belowEXS.forEach(item => {
            if (!studentMap[item.name] || item.score < studentMap[item.name].score) {
                studentMap[item.name] = item;
            }
        });
        return Object.values(studentMap).sort((a, b) => a.score - b.score);
    };

    const handleCardClick = (demoName, groupLabel, groupStats) => {
        const studentsBelowEXS = getStudentsBelowEXS(groupStats.data);
        setSelectedGroup({
            name: demoName,
            label: groupLabel,
            students: studentsBelowEXS,
            percentageAtEXS: groupStats.percentageAtEXS,
            totalCount: groupStats.count
        });
    };

    const calculateGap = (group1, group2) => {
        const diff = parseFloat(group1.percentageAtEXS) - parseFloat(group2.percentageAtEXS);
        return diff.toFixed(1);
    };

    const getGapIcon = (gap) => {
        if (gap > 2) return <TrendingUp className="w-4 h-4 text-green-600" />;
        if (gap < -2) return <TrendingDown className="w-4 h-4 text-red-600" />;
        return <Minus className="w-4 h-4 text-gray-400" />;
    };

    const getGapColor = (gap) => {
        if (gap > 2) return 'text-green-600 bg-green-50';
        if (gap < -2) return 'text-red-600 bg-red-50';
        return 'text-gray-600 bg-gray-50';
    };

    const allDemographics = [
        {
            key: 'pupilPremium',
            name: 'Pupil Premium',
            group1: { label: 'PP', ...calculateGroupStats('pupilPremium', 'Yes') },
            group2: { label: 'Non-PP', ...calculateGroupStats('pupilPremium', 'No') }
        },
        {
            key: 'sen',
            name: 'SEN',
            group1: { label: 'SEN', ...calculateGroupStats('sEN', 'Yes') },
            group2: { label: 'Non-SEN', ...calculateGroupStats('sEN', 'No') }
        },
        {
            key: 'eal',
            name: 'EAL',
            group1: { label: 'EAL', ...calculateGroupStats('eAL', 'Yes') },
            group2: { label: 'Non-EAL', ...calculateGroupStats('eAL', 'No') }
        },
        {
            key: 'summerBorn',
            name: 'Summer Born',
            group1: { label: 'Summer Born', ...calculateGroupStats('bornInSummer', 'Yes') },
            group2: { label: 'Not Summer Born', ...calculateGroupStats('bornInSummer', 'No') }
        },
        {
            key: 'inYearAdmission',
            name: 'In Year Admission',
            group1: { label: 'In Year', ...calculateGroupStats('inYearAdmission', 'Yes') },
            group2: { label: 'Not In Year', ...calculateGroupStats('inYearAdmission', 'No') }
        },
        {
            key: 'sex',
            name: 'Sex',
            group1: { label: 'Male', ...calculateGroupStats('sex', 'Male') },
            group2: { label: 'Female', ...calculateGroupStats('sex', 'Female') }
        }
    ];

    const visibleDemographicsList = allDemographics.filter(d => visibleDemographics[d.key]);

    if (!data.length) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Demographic Performance Gap</h3>
                <p className="text-sm text-gray-500">No data available</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Demographic Performance Gaps</h3>
                <p className="text-xs text-gray-500 mb-4">% of students at EXS or above • Total cohort: {totalStudents} students • Click cards to see students below EXS</p>

                {/* Demographic visibility toggles */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Show/Hide Demographics:</p>
                    <div className="flex flex-wrap gap-2">
                        {allDemographics.map(demo => (
                            <label key={demo.key} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 rounded cursor-pointer text-xs">
                                <input
                                    type="checkbox"
                                    checked={visibleDemographics[demo.key]}
                                    onChange={() => toggleDemographic(demo.key)}
                                    className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-gray-700">{demo.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    {visibleDemographicsList.map((demo) => {
                        const gap = calculateGap(demo.group1, demo.group2);

                        return (
                            <div key={demo.name} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-700">{demo.name}</h4>
                                    <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${getGapColor(parseFloat(gap))}`}>
                                        {getGapIcon(parseFloat(gap))}
                                        <span>{Math.abs(gap)}% gap</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        onClick={() => handleCardClick(demo.name, demo.group1.label, demo.group1)}
                                        className="bg-indigo-50 rounded-lg p-3 cursor-pointer hover:bg-indigo-100 transition-colors"
                                    >
                                        <div className="text-xs font-medium text-indigo-600 mb-1">{demo.group1.label}</div>
                                        <div className="text-2xl font-bold text-indigo-700">{demo.group1.percentageAtEXS}%</div>
                                        <div className="text-xs text-indigo-600 mt-1">
                                            {demo.group1.count} students ({demo.group1.cohortPercentage}% of cohort)
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => handleCardClick(demo.name, demo.group2.label, demo.group2)}
                                        className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="text-xs font-medium text-gray-600 mb-1">{demo.group2.label}</div>
                                        <div className="text-2xl font-bold text-gray-700">{demo.group2.percentageAtEXS}%</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {demo.group2.count} students ({demo.group2.cohortPercentage}% of cohort)
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal to show students below EXS */}
            {selectedGroup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedGroup(null)}>
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-200 bg-red-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {selectedGroup.label} - Students Below EXS
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {selectedGroup.students.length} of {selectedGroup.totalCount} students ({((1 - parseFloat(selectedGroup.percentageAtEXS) / 100) * 100).toFixed(1)}%) not on track
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedGroup(null)}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            {selectedGroup.students.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p className="text-lg font-semibold">🎉 All students are on track!</p>
                                    <p className="text-sm mt-2">All students in this group are at EXS or above</p>
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Student Name</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Term</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Score</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Year Group</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {selectedGroup.students.map((student, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">{student.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{student.subject}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{student.term}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${student.score === 1 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {getScoreLabel(student.score)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{student.yearGroup}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
