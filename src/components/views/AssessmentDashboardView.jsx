import React, { useState, useMemo } from 'react';
import { ScoreDistribution } from '../charts/ScoreDistribution';
import { AssessmentView } from './AssessmentView';
import { calculatePercentageAtEXSPlus, SCORE_LEVELS } from '../../lib/scoreUtils';
import { Users, Target, TrendingUp, Table, LayoutDashboard, ChevronDown } from 'lucide-react';

export function AssessmentDashboardView({ data, historicalData }) {
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard' or 'table'

    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;

        const total = data.length;
        const exsPlus = calculatePercentageAtEXSPlus(data, 'score');

        // Calculate demographic gaps (% EXS+)
        const filterBy = (key, val) => data.filter(d => d[key] === val);

        const pp = filterBy('pupilPremium', 'Yes');
        const nonPp = filterBy('pupilPremium', 'No');
        const sen = filterBy('sen', 'Yes');
        const nonSen = filterBy('sen', 'No');

        // Legacy fallback logic removed as data is now standardized to Yes/No
        const senList = sen;
        const nonSenList = nonSen;

        return {
            total,
            exsPlus,
            ppExs: calculatePercentageAtEXSPlus(pp, 'score'),
            nonPpExs: calculatePercentageAtEXSPlus(nonPp, 'score'),
            senExs: calculatePercentageAtEXSPlus(senList, 'score'),
            nonSenExs: calculatePercentageAtEXSPlus(nonSenList, 'score'),
        };

        return {
            total,
            exsPlus,
            ppExs: calculatePercentageAtEXSPlus(pp, 'score'),
            nonPpExs: calculatePercentageAtEXSPlus(nonPp, 'score'),
            senExs: calculatePercentageAtEXSPlus(sen, 'score'),
            nonSenExs: calculatePercentageAtEXSPlus(nonSen, 'score'),
        };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessment Data Available</h3>
                <p className="text-gray-500">Please select a Subject and Term from the sidebar filters.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* View Mode Toggle (Mini) */}
            <div className="flex justify-end">
                <div className="flex items-center bg-gray-100 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'dashboard' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Table className="w-4 h-4" />
                        Data Table
                    </button>
                </div>
            </div>

            {viewMode === 'dashboard' ? (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricCard
                            title="Total Snapshots"
                            value={stats?.total}
                            icon={Users}
                            color="blue"
                            subtitle="Filtered rows"
                        />
                        <MetricCard
                            title="% At Expected+"
                            value={`${stats?.exsPlus}%`}
                            icon={Target}
                            color="emerald"
                            subtitle="EXS or GDS Grade"
                        />
                        <MetricCard
                            title="PP vs Non-PP"
                            value={`${stats?.ppExs}% / ${stats?.nonPpExs}%`}
                            icon={TrendingUp}
                            color="amber"
                            subtitle="Expected+ Percentage"
                        />
                        <MetricCard
                            title="SEN vs Non-SEN"
                            value={`${stats?.senExs}% / ${stats?.nonSenExs}%`}
                            icon={TrendingUp}
                            color="indigo"
                            subtitle="Expected+ Percentage"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1">
                            <ScoreDistribution data={data} subjectKey="score" />
                        </div>
                        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Definitions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(SCORE_LEVELS).map(([key, level]) => (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: level.color }}></div>
                                            <div>
                                                <p className="font-bold text-gray-900">{level.code}</p>
                                                <p className="text-sm text-gray-500">{level.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-gray-700">
                                                {data.filter(d => d.score === key).length}
                                            </p>
                                            <p className="text-xs text-gray-400">Students</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <AssessmentView data={data} />
            )}

        </div>
    );
}

function MetricCard({ title, value, icon: Icon, color, subtitle }) {
    const colorMap = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    };

    return (
        <div className={`bg-white p-6 rounded-xl border shadow-sm ${colorMap[color].split(' ')[2]}`}>
            <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <div className={`p-2 rounded-lg ${colorMap[color].split(' ').slice(0, 2).join(' ')}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
    );
}
