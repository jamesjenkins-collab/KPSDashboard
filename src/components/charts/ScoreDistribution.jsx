import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { calculateScoreDistribution, SCORE_LEVELS } from '../../lib/scoreUtils';
import { X } from 'lucide-react';

export function ScoreDistribution({ data, subjectKey = 'score' }) {
    const [selectedScore, setSelectedScore] = useState(null);
    const distribution = calculateScoreDistribution(data, subjectKey);

    const handlePieClick = (entry) => {
        setSelectedScore(entry);
    };

    /**
     * Normalizes grade codes for filtering
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

    const getStudentsAtScore = (scoreKey) => {
        if (!data.length) return [];

        return data
            .filter(item => normalizeGrade(item[subjectKey]) === scoreKey)
            .map(item => ({
                name: item.name,
                subject: item.subject || 'General',
                term: item.term || 'N/A'
            }));
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent < 0.05) return null;

        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="central"
                className="font-bold text-sm"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Attainment Distribution</h3>
                <p className="text-sm text-gray-500 mb-4">Click segments to see students</p>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={distribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={CustomLabel}
                                outerRadius={80}
                                dataKey="value"
                                onClick={handlePieClick}
                                style={{ cursor: 'pointer' }}
                            >
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const d = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200">
                                                <p className="font-bold" style={{ color: d.color }}>{d.code}</p>
                                                <p className="text-sm text-gray-600">{d.name}</p>
                                                <p className="text-sm font-semibold">{d.value} students ({d.percentage}%)</p>
                                                <p className="text-xs text-gray-500 mt-1">Click to view names</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                formatter={(value, entry) => (
                                    <span className="text-xs text-gray-600">
                                        {entry.payload.code}
                                    </span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Modal to show student names */}
            {selectedScore && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedScore(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: selectedScore.color + '10' }}>
                            <div>
                                <h3 className="text-xl font-bold" style={{ color: selectedScore.color }}>
                                    {selectedScore.code} - {selectedScore.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    {selectedScore.value} students • {selectedScore.percentage}% of selection
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedScore(null)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            <table className="w-full">
                                <thead className="bg-gray-50 rounded-lg">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Subject</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Term</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {getStudentsAtScore(selectedScore.score).map((student, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{student.subject}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{student.term}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
