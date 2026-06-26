import React, { useMemo } from 'react';
import { Users, School, Percent, TrendingUp, TrendingDown, Flag } from 'lucide-react';

export function SchoolContextView({ data }) {
    // 1. Calculate Whole School Metrics
    const schoolMetrics = useMemo(() => {
        if (!data || data.length === 0) return null;

        // Deduplicate students by UPN
        const uniqueStudents = Object.values(
            data.reduce((acc, curr) => {
                if (curr.upn && !acc[curr.upn]) {
                    acc[curr.upn] = curr;
                }
                return acc;
            }, {})
        );

        const total = uniqueStudents.length;
        const sendCount = uniqueStudents.filter(d => d.sen === 'Yes').length;
        const ppCount = uniqueStudents.filter(d => d.pupilPremium === 'Yes').length;
        const boysCount = uniqueStudents.filter(d => {
            const s = String(d.sex).trim().toLowerCase();
            return s === 'm' || s === 'male' || s === 'boy';
        }).length;
        const mpaCount = uniqueStudents.filter(d => d.inYearAdmission === 'Yes').length;

        // Attendance - parse "95.5%" or number
        let totalAtt = 0;
        let attCount = 0;
        uniqueStudents.forEach(d => {
            if (d.attendance) {
                // Parse float (remove %)
                const val = parseFloat(String(d.attendance).replace('%', ''));
                if (!isNaN(val)) {
                    totalAtt += val;
                    attCount++;
                }
            }
        });
        const avgAttendance = attCount > 0 ? (totalAtt / attCount) : 0;

        return {
            total,
            send: (sendCount / total) * 100,
            pp: (ppCount / total) * 100,
            attendance: avgAttendance,
            boys: (boysCount / total) * 100,
            mpa: (mpaCount / total) * 100
        };
    }, [data]);

    // 2. Calculate Year Group Metrics
    const yearGroupMetrics = useMemo(() => {
        if (!data || !schoolMetrics) return [];

        // Deduplicate students by UPN
        const uniqueStudents = Object.values(
            data.reduce((acc, curr) => {
                if (curr.upn && !acc[curr.upn]) {
                    acc[curr.upn] = curr;
                }
                return acc;
            }, {})
        );

        // Group by Year Group
        const groups = {}; // "Year 1" -> []

        uniqueStudents.forEach(d => {
            // Normalize Year Group
            // Using registration form if yearGroup field is empty?
            // Actually googleSheets.js parses 'yearGroup' field if available, 
            // OR we can derive from reg form like App.jsx does.
            // App.jsx filters rely on derived year group.
            // Let's rely on `d.yearGroup` from sheet if likely there, or derive it.
            // googleSheets.js logic for `yearGroup(s) this academic year` maps to `yearGroup`.
            // But let's check if it needs parsing (e.g. "Year 4" or just "4").

            let yg = d.yearGroup;
            // Fallback to reg form parsing if no explicit year group
            if (!yg && d.registrationForm) {
                const match = d.registrationForm.match(/(?:^|y)(\d+)/i);
                if (match) yg = `Year ${match[1]}`;
            }
            // Normalize "4" to "Year 4"
            if (yg && !String(yg).toLowerCase().startsWith('year') && !String(yg).toLowerCase().startsWith('nur') && !String(yg).toLowerCase().startsWith('rec')) {
                // Check if it's just a number
                if (!isNaN(parseFloat(yg))) yg = `Year ${yg}`;
            }

            if (!yg) return;

            if (!groups[yg]) groups[yg] = [];
            groups[yg].push(d);
        });

        // Calculate metrics per group
        const metrics = Object.entries(groups).map(([group, students]) => {
            const total = students.length;
            const sendCount = students.filter(d => d.sen === 'Yes').length;
            const ppCount = students.filter(d => d.pupilPremium === 'Yes').length;
            const boysCount = students.filter(d => {
                const s = String(d.sex).trim().toLowerCase();
                return s === 'm' || s === 'male' || s === 'boy';
            }).length;
            const mpaCount = students.filter(d => d.inYearAdmission === 'Yes').length;

            let totalAtt = 0;
            let attCount = 0;
            students.forEach(d => {
                if (d.attendance) {
                    const val = parseFloat(String(d.attendance).replace('%', ''));
                    if (!isNaN(val)) {
                        totalAtt += val;
                        attCount++;
                    }
                }
            });
            const avgAttendance = attCount > 0 ? (totalAtt / attCount) : 0;

            return {
                group,
                count: total,
                send: (sendCount / total) * 100,
                pp: (ppCount / total) * 100,
                attendance: avgAttendance,
                boys: (boysCount / total) * 100,
                mpa: (mpaCount / total) * 100
            };
        });

        // Sort by Year Group (Nursery -> Reception -> Year 1 -> ...)
        const sortOrder = ['Nursery', 'Reception', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'];
        return metrics.sort((a, b) => {
            const idxA = sortOrder.indexOf(a.group);
            const idxB = sortOrder.indexOf(b.group);
            // If not found, put at end
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
        });

    }, [data, schoolMetrics]);

    // Red Flag Helper
    // Red flags: PP 5%+ above average, others 10%+ above (or 10%+ below for attendance)
    const getRedFlags = (metric, value) => {
        if (!schoolMetrics) return null;
        const schoolAvg = schoolMetrics[metric];

        if (metric === 'pp') {
            if (value >= schoolAvg + 5) return true;
        } else if (metric === 'attendance') {
            if (schoolAvg > 0 && value <= schoolAvg - 10) return true; // 10% below average? Or absolute 10%? Assume percentage points.
        } else {
            // Others: SEND, Boys, MPA
            if (value >= schoolAvg + 10) return true;
        }
        return false;
    };

    if (!data || data.length === 0) return null;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <School className="w-8 h-8 text-indigo-600" />
                        School Context
                    </h2>
                    <p className="text-gray-500">Year group demographics with contextual red flags</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                    Download PDF
                </button>
            </div>

            {/* School Profile Cards */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <School className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold">School Profile</h3>
                        <p className="text-white/80 text-sm">Whole school overview</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <MetricCard title="TOTAL STUDENTS" value={schoolMetrics.total} icon={Users} />
                    <MetricCard title="SEND" value={`${schoolMetrics.send.toFixed(1)}%`} icon={Flag} />
                    <MetricCard title="PUPIL PREMIUM" value={`${schoolMetrics.pp.toFixed(1)}%`} icon={TrendingUp} />
                    <MetricCard title="ATTENDANCE" value={`${schoolMetrics.attendance.toFixed(1)}%`} icon={Percent} />
                    <MetricCard title="BOYS" value={`${schoolMetrics.boys.toFixed(1)}%`} icon={Users} />
                    <MetricCard title="MID PHASE ADM." value={`${schoolMetrics.mpa.toFixed(1)}%`} icon={TrendingUp} />
                </div>
            </div>

            {/* Year Group Context Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" />
                        Year Group Context
                    </h3>
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                        <Flag className="w-4 h-4" />
                        Red flags: PP 5%+ above average, others 10%+ above (or 10%+ below for attendance)
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-left">YEAR GROUP</th>
                                <th className="px-6 py-4">STUDENTS</th>
                                <th className="px-6 py-4">SEND %</th>
                                <th className="px-6 py-4">PP %</th>
                                <th className="px-6 py-4">ATTENDANCE %</th>
                                <th className="px-6 py-4">BOYS %</th>
                                <th className="px-6 py-4">MPA %</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {yearGroupMetrics.map((yg) => (
                                <tr key={yg.group} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-900 text-left">{yg.group}</td>
                                    <td className="px-6 py-4 font-medium">{yg.count}</td>

                                    <MetricCell value={yg.send} isFlagged={getRedFlags('send', yg.send)} />
                                    <MetricCell value={yg.pp} isFlagged={getRedFlags('pp', yg.pp)} />
                                    <MetricCell value={yg.attendance} isFlagged={getRedFlags('attendance', yg.attendance)} suffix="%" />
                                    <MetricCell value={yg.boys} isFlagged={getRedFlags('boys', yg.boys)} />
                                    <MetricCell value={yg.mpa} isFlagged={getRedFlags('mpa', yg.mpa)} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon }) {
    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-white/70">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">{title}</span>
            </div>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    );
}

function MetricCell({ value, isFlagged, suffix = '%' }) {
    return (
        <td className="px-6 py-4">
            <div className="flex items-center justify-center gap-2">
                <span className={`font-bold ${isFlagged ? 'text-red-600' : 'text-gray-700'}`}>
                    {value.toFixed(1)}{suffix}
                </span>
                {isFlagged && (
                    <div className="text-red-500">
                        <Flag className="w-4 h-4 fill-current" />
                    </div>
                )}
            </div>
        </td>
    );
}
