import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Filter, X } from 'lucide-react';

export function EYFSView({ data, fullData = [] }) {
    const [selectedTerm, setSelectedTerm] = useState('Autumn');
    const [filters, setFilters] = useState({
        regGroup: '',
        sex: '',
        sen: '',
        summerBorn: ''
    });

    // Merge demographic data from fullData into EYFS data
    const mergedData = useMemo(() => {
        // Helper: Create canonical name (lowercase, sorted parts) to handle "John Doe" vs "Doe, John"
        // Also strips punctuation
        const getCanonicalName = (name) => {
            if (!name) return '';
            return name.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '') // remove non-alphanum (keep spaces for splitting)
                .split(/\s+/) // split
                .filter(Boolean)
                .sort()
                .join('');
        };

        // Create a map of canonical name -> demographics
        const demoMap = new Map();
        if (fullData && fullData.length > 0) {
            console.log("Full Data Keys Sample:", Object.keys(fullData[0])); // Debug keys
            fullData.forEach(student => {
                const cName = getCanonicalName(student.name);
                if (!cName) return;

                // Determine if this student is likely EYFS (Year N or R)
                const isEyfs = /^(R|N|Rec|Nur)/i.test(student.yearGroup || '');

                // If name exists, only overwrite if the new candidate is EYFS and the existing one wasn't
                // Or if duplicates, just keep the first EYFS one we found
                const existing = demoMap.get(cName);

                if (!existing || (isEyfs && !existing.isEyfs)) {
                    demoMap.set(cName, {
                        regGroup: student.registrationForm || student.registrationGroup || student.regGroup || 'Unknown',
                        sex: student.sex || '',
                        sen: student.sEN || student.sen || 'N',
                        summerBorn: student.bornInSummer || student.summerBorn || 'N',
                        isEyfs: isEyfs
                    });
                }
            });
        }

        return data.map(row => {
            const cName = getCanonicalName(row.name);
            const matchedDemo = demoMap.get(cName);

            // Priority: Data from Main Sheet (matched) -> Data from EYFS Sheet (row) -> Default
            return {
                ...row,
                regGroup: matchedDemo?.regGroup || row.registrationForm || row.regGroup || 'Unknown',
                sex: matchedDemo?.sex || row.sex || 'Unknown',
                sen: matchedDemo?.sen || row.sEN || row.sen || 'N',
                summerBorn: matchedDemo?.summerBorn || row.bornInSummer || row.summerBorn || 'N'
            };
        });
    }, [data, fullData]);

    // Extract unique filter options
    const filterOptions = useMemo(() => {
        const extract = (key) => [...new Set(mergedData.map(d => d[key]).filter(Boolean))].sort();
        return {
            regGroup: extract('regGroup'),
            sex: extract('sex'),
            sen: extract('sen'),
            summerBorn: extract('summerBorn')
        };
    }, [mergedData]);

    // Filter Data
    const filteredData = useMemo(() => {
        return mergedData.filter(d => {
            if (d.term !== selectedTerm) return false;
            if (filters.regGroup && d.regGroup !== filters.regGroup) return false;
            if (filters.sex && d.sex !== filters.sex) return false;
            if (filters.sen && d.sen !== filters.sen) return false;
            if (filters.summerBorn && d.summerBorn !== filters.summerBorn) return false;
            return true;
        });
    }, [mergedData, selectedTerm, filters]);

    // Update termData reference to use filteredData
    const termData = filteredData;



    // 2. Pivot for Heatmap (Rows: Students, Cols: ELGs)
    const heatmapData = useMemo(() => {
        const students = {};
        const elgs = new Set();

        termData.forEach(row => {
            if (!students[row.name]) {
                students[row.name] = { name: row.name, ...row };
            }
            students[row.name][row.subject] = row.score;
            elgs.add(row.subject);
        });

        return {
            rows: Object.values(students).sort((a, b) => a.name.localeCompare(b.name)),
            columns: Array.from(elgs).sort()
        };
    }, [termData]);


    // Update heatmap rows to include Student Average
    const processedHeatmapRows = useMemo(() => {
        return heatmapData.rows.map(row => {
            const scores = heatmapData.columns.map(col => row[col]).filter(s => s !== undefined);
            const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
            return { ...row, average: avg };
        });
    }, [heatmapData]);

    const getScoreColor = (score) => {
        if (score >= 1.8) return 'bg-green-100 text-green-800 border-green-200'; // Strong EXS
        if (score === 2) return 'bg-green-100 text-green-800 border-green-200'; // EXS
        if (score >= 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // WTS
        if (score === 1) return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // WTS
        return 'bg-red-100 text-red-800 border-red-200'; // BLW
    };

    // Helper for granular averages (float values)
    const getAvgColor = (score) => {
        if (score >= 1.8) return 'bg-green-600 text-white';
        if (score >= 1.5) return 'bg-green-500 text-white';
        if (score >= 1.0) return 'bg-yellow-500 text-white';
        return 'bg-red-500 text-white';
    };

    const getScoreLabel = (score) => {
        if (score === 2) return 'EXP';
        if (score === 1) return 'WTS';
        if (score === 0) return 'BLW';
        return '-';
    };

    // Helper: Normalize string for matching (remove spaces, punctuation, lowercase, convert & to and)
    const normalize = (str) => {
        if (!str) return '';
        return str.toString().toLowerCase()
            .replace(/&/g, 'and')
            .replace(/[^a-z0-9]/g, ''); // "Health and Self-care" -> "healthandselfcare"
    };

    // 4. Grouped Columns (7 Areas of Learning - 2021 Framework)
    const groupedStructure = useMemo(() => {
        const structure = [
            // PRIME AREAS (Green)
            {
                group: "Communication and Language",
                type: "Prime",
                color: "bg-green-100 border-green-300 text-green-900",
                areas: [
                    "Listening, Attention and Understanding", "Listening and attention", "Understanding", // Consolidated or split
                    "Speaking"
                ]
            },
            {
                group: "Physical Development",
                type: "Prime",
                color: "bg-green-100 border-green-300 text-green-900",
                areas: [
                    "Gross Motor Skills", "Moving and handling",
                    "Fine Motor Skills", "Health and self-care"
                ]
            },
            {
                group: "Personal, Social and Emotional Development",
                type: "Prime",
                color: "bg-green-100 border-green-300 text-green-900",
                areas: [
                    "Self-Regulation", "Self-confidence and self-awareness",
                    "Managing Self", "Managing feelings and behaviour",
                    "Building Relationships", "Making relationships"
                ]
            },
            // SPECIFIC AREAS (Red)
            {
                group: "Literacy",
                type: "Specific",
                color: "bg-red-100 border-red-300 text-red-900",
                areas: [
                    "Comprehension",
                    "Word Reading", "Reading",
                    "Writing"
                ]
            },
            {
                group: "Mathematics",
                type: "Specific",
                color: "bg-red-100 border-red-300 text-red-900",
                areas: [
                    "Number", "Numbers",
                    "Numerical Patterns", "Shape, space and measures", "SSM"
                ]
            },
            {
                group: "Understanding the World",
                type: "Specific",
                color: "bg-red-100 border-red-300 text-red-900",
                areas: [
                    "Past and Present", "People and communities",
                    "People, Culture and Communities", "The World",
                    "The Natural World", "Technology"
                ]
            },
            {
                group: "Expressive Arts and Design",
                type: "Specific",
                color: "bg-red-100 border-red-300 text-red-900",
                areas: [
                    "Creating with Materials", "Exploring and using media and materials", "EUMM",
                    "Being Imaginative and Expressive", "Being imaginative"
                ]
            }
        ];
        return structure;
    }, []);

    // Helper: Sort columns based on structure using normalized matching
    const sortedColumns = useMemo(() => {
        if (!heatmapData.columns.length) return [];

        // Flatten all defined areas (normalized)
        const allDefined = [];
        groupedStructure.forEach(g => {
            g.areas.forEach(a => allDefined.push(normalize(a)));
        });

        const getIndex = (colName) => {
            // Try to match normalized column name against normalized defined areas
            const normCol = normalize(colName);
            // We find the first index where the config string matches the column string
            // We use findIndex on the FULL config array to preserve global order
            return allDefined.findIndex(configStr => configStr === normCol || normCol.includes(configStr) || configStr.includes(normCol));
        };

        return [...heatmapData.columns].sort((a, b) => {
            const indexA = getIndex(a);
            const indexB = getIndex(b);

            // If found, use index. If not found, push to end (infinity)
            const validA = indexA !== -1 ? indexA : 9999;
            const validB = indexB !== -1 ? indexB : 9999;

            if (validA !== validB) return validA - validB;
            return a.localeCompare(b);
        });
    }, [heatmapData.columns, groupedStructure]);

    // Helper: Determine which group a column belongs to
    const getColumnGroup = (colName) => {
        const normCol = normalize(colName);
        return groupedStructure.find(g =>
            g.areas.some(a => {
                const normArea = normalize(a);
                return normArea === normCol || normCol.includes(normArea);
            })
        );
    };

    // 1. Calculate ELG Performance (for Bar Chart) - Sorted with Spacers
    const elgStats = useMemo(() => {
        const stats = [];
        let lastGroup = null;

        sortedColumns.forEach((elg, index) => {
            // Check for group change to inject spacer
            const currentGroup = getColumnGroup(elg)?.group;

            // Add spacer if group changes (and not first item)
            if (lastGroup && currentGroup !== lastGroup) {
                stats.push({
                    name: `spacer-${index}`,
                    isSpacer: true,
                    EXS: 0, WTS: 0, BLW: 0
                });
            }
            lastGroup = currentGroup;

            // Calculate stats
            const scores = termData.filter(d => d.subject === elg);
            const total = scores.length;

            if (total > 0) {
                const exs = scores.filter(d => d.score === 2).length;
                const wts = scores.filter(d => d.score === 1).length;
                const blw = scores.filter(d => d.score === 0).length;

                stats.push({
                    name: elg,
                    EXS: parseFloat(((exs / total) * 100).toFixed(1)),
                    WTS: parseFloat(((wts / total) * 100).toFixed(1)),
                    BLW: parseFloat(((blw / total) * 100).toFixed(1)),
                    total,
                    isSpacer: false
                });
            }
        });

        return stats;
    }, [termData, sortedColumns, getColumnGroup]);

    // 3. Subject Averages (The "Rubix" View) - Refactored to match Heatmap Order
    const subjectAverages = useMemo(() => {
        // We iterate through sortedColumns (which are already in the correct EYFS order)
        return sortedColumns.map(subjectName => {
            // Find stats for this subject
            const stats = elgStats.find(s => s.name === subjectName);

            // Calculate average if stats missing (fallback)
            let avg = 0;
            if (stats) {
                const scores = termData.filter(d => d.subject === subjectName).map(d => d.score);
                if (scores.length) {
                    avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                }
            }

            // Get Group Name
            const groupInfo = getColumnGroup(subjectName);

            return {
                name: subjectName,
                avg: parseFloat(avg.toFixed(2)),
                group: groupInfo ? groupInfo.group : 'Unknown'
            };
        });
    }, [sortedColumns, elgStats, termData, getColumnGroup]);

    // 5. Calculate GLD and Adjusted GLD
    // GLD = Expected (2) in Prime Areas + Literacy + Maths (Total 12 ELGs)
    // Adjusted GLD = Expected (2) in at least 10 of these 12 ELGs
    const gldStats = useMemo(() => {
        if (!heatmapData.rows.length) return { gld: { count: 0, percentage: 0 }, adjusted: { count: 0, percentage: 0 } };

        const gldGroups = [
            "Communication and Language",
            "Physical Development",
            "Personal, Social and Emotional Development",
            "Literacy",
            "Mathematics"
        ];

        // Get all ELG names that fall under these groups
        const gldColumns = sortedColumns.filter(col => {
            const group = getColumnGroup(col);
            return group && gldGroups.includes(group.group);
        });

        if (gldColumns.length === 0) return { gld: { count: 0, percentage: 0 }, adjusted: { count: 0, percentage: 0 } };

        let gldCount = 0;
        let adjustedCount = 0;

        heatmapData.rows.forEach(student => {
            // Count how many GLD subjects this student passed
            const passedCount = gldColumns.reduce((acc, col) => {
                return student[col] === 2 ? acc + 1 : acc;
            }, 0);

            // Standard GLD: Passed ALL (12/12)
            // Note: We check if they passed ALL available GLD columns found in the sheet
            // Ideally this is 12, but we'll use gldColumns.length to be safe
            if (passedCount === gldColumns.length) gldCount++;

            // Adjusted GLD: Passed at least 10
            if (passedCount >= 10) adjustedCount++;
        });

        return {
            gld: {
                count: gldCount,
                percentage: ((gldCount / heatmapData.rows.length) * 100).toFixed(1)
            },
            adjusted: {
                count: adjustedCount,
                percentage: ((adjustedCount / heatmapData.rows.length) * 100).toFixed(1)
            }
        };
    }, [heatmapData, sortedColumns, getColumnGroup]);

    if (!data.length) return <div className="p-8 text-center text-gray-500">Loading EYFS Data...</div>;

    return (
        <div className="space-y-6 animate-fade-in pb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">EYFS Tracker</h2>
                        <p className="text-sm text-gray-500">Early Learning Goals Progress</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Term Selector */}
                        <select
                            value={selectedTerm}
                            onChange={(e) => setSelectedTerm(e.target.value)}
                            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                            {['Autumn', 'Spring', 'Summer'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>

                        {/* Demographics Filters */}
                        {[
                            { label: 'Reg Group', key: 'regGroup' },
                            { label: 'Sex', key: 'sex' },
                            { label: 'SEN', key: 'sen' },
                            { label: 'Summer Born', key: 'summerBorn' }
                        ].map(f => (
                            <select
                                key={f.key}
                                value={filters[f.key]}
                                onChange={(e) => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
                                className={`px-3 py-2 border rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 ${filters[f.key] ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-gray-300 text-gray-700'}`}
                            >
                                <option value="">{f.label}: All</option>
                                {filterOptions[f.key].map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        ))}

                        {/* Clear Filters */}
                        {Object.values(filters).some(Boolean) && (
                            <button
                                onClick={() => setFilters({ regGroup: '', sex: '', sen: '', summerBorn: '' })}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Clear Filters"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Subject Performance Rubric (The "Rubix") */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Subject Performance Matrix (Avg Score 0-2)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* STANDARD GLD Tile */}
                    <div className="bg-blue-600 text-white p-4 rounded-lg shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:scale-105 border border-blue-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                        <span className="text-xs font-bold opacity-90 mb-1 tracking-wider uppercase">GLD</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold">{gldStats.gld.percentage}%</span>
                        </div>
                        <span className="text-[10px] opacity-75">All {sortedColumns.filter(c => ["Communication and Language", "Physical Development", "Personal, Social and Emotional Development", "Literacy", "Mathematics"].includes(getColumnGroup(c)?.group)).length} Areas</span>
                    </div>

                    {/* ADJUSTED GLD Tile */}
                    <div className="bg-indigo-600 text-white p-4 rounded-lg shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:scale-105 border border-indigo-700 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white opacity-10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
                        <span className="text-xs font-bold opacity-90 mb-1 tracking-wider uppercase">Adj. GLD</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-extrabold">{gldStats.adjusted.percentage}%</span>
                        </div>
                        <span className="text-[10px] opacity-75">10+ Areas</span>
                    </div>

                    {subjectAverages.map(subj => (
                        <div key={subj.name} className={`${getAvgColor(subj.avg)} p-4 rounded-lg shadow-sm flex flex-col items-center justify-center text-center transition-transform hover:scale-105 min-h-[110px]`}>
                            <span className="text-[9px] uppercase tracking-wider opacity-80 mb-1 leading-tight h-5 flex items-center">{subj.group}</span>
                            <span className="text-xs font-bold leading-tight mb-1 h-8 flex items-center justify-center">{subj.name}</span>
                            <span className="text-2xl font-extrabold">{subj.avg}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Overview Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">ELG Performance Overview</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={elgStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={100}
                                interval={0}
                                fontSize={10}
                                tickFormatter={(value) => value.startsWith('spacer') ? '' : value}
                            />
                            <YAxis unit="%" />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length && !label.startsWith('spacer')) {
                                        return (
                                            <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-xs">
                                                <p className="font-bold mb-2">{label}</p>
                                                {payload.map((entry, index) => (
                                                    <p key={index} style={{ color: entry.color }}>
                                                        {entry.name}: {entry.value}%
                                                    </p>
                                                ))}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Bar dataKey="EXS" stackId="a" fill="#16a34a" name="Expected (2)" />
                            <Bar dataKey="WTS" stackId="a" fill="#eab308" name="Working Towards (1)" />
                            <Bar dataKey="BLW" stackId="a" fill="#dc2626" name="Below (0)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Heatmap */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900">Student Progress Heatmap</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            {/* Group Headers */}
                            <tr>
                                <th className="px-4 py-3 bg-gray-50 border-b border-gray-200 sticky left-0 z-20"></th>
                                <th className="bg-gray-50 border-b border-gray-200 border-r border-gray-300"></th>
                                {groupedStructure.map((group, idx) => {
                                    // Count how many visible columns belong to this group
                                    const colCount = sortedColumns.filter(c => getColumnGroup(c) === group).length;
                                    if (colCount === 0) return null;
                                    return (
                                        <th
                                            key={group.group}
                                            colSpan={colCount}
                                            className={`px-2 py-1 text-center text-[10px] uppercase tracking-wider font-bold border-b border-gray-300 ${group.color} border-r`}
                                        >
                                            {group.group}
                                        </th>
                                    );
                                })}
                            </tr>
                            <tr>
                                <th className="px-4 py-3 bg-gray-50 border-b border-gray-200 font-bold text-gray-700 sticky left-0 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    Student Name
                                </th>
                                <th className="px-2 py-3 bg-gray-100 border-b border-gray-200 font-bold text-gray-800 text-xs text-center border-r border-gray-300">
                                    AVG
                                </th>
                                {sortedColumns.map(col => {
                                    const group = getColumnGroup(col);
                                    return (
                                        <th key={col} className={`px-2 py-3 border-b border-gray-200 font-medium text-xs text-center min-w-[60px] whitespace-normal ${group ? group.color.replace('text-', 'text-opacity-80 text-') : 'bg-gray-50 text-gray-500'}`}>
                                            {col}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedHeatmapRows.map(row => (
                                <tr key={row.name} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 font-medium text-gray-900 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        {row.name}
                                    </td>
                                    <td className={`p-1 text-center font-bold border-r border-gray-200 ${row.average >= 1.8 ? 'text-green-700' : row.average >= 1 ? 'text-yellow-700' : 'text-red-700'}`}>
                                        {row.average}
                                    </td>
                                    {sortedColumns.map(col => (
                                        <td key={col} className="p-1 text-center">
                                            {row[col] !== undefined && (
                                                <div className={`w-full h-8 flex items-center justify-center rounded border ${getScoreColor(row[col])} text-xs font-bold`}>
                                                    {getScoreLabel(row[col])}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
