import React, { useState, useMemo } from 'react';
import { ProgressScoreCards } from '../charts/ProgressScoreCards';
import { TrendingUp, Calendar, Filter, AlertCircle } from 'lucide-react';

export function ProgressView({ currentData, historicalData }) {
    // 1. Extract available historical years from data
    const availableYears = useMemo(() => {
        if (!historicalData || !historicalData.length) return [];
        const years = new Set(historicalData.map(d => d.academicYear)); // e.g. "24/25"
        // If academicYear is stored as "24/25" string (it is, see googleSheets.js)
        return Array.from(years).sort().reverse(); // Newest first
    }, [historicalData]);

    // 2. State for selected year AND subject
    const [selectedYear, setSelectedYear] = useState(availableYears[0] || '');
    const [selectedSubject, setSelectedSubject] = useState('All');

    // Update selected year if availableYears changes and current selection is invalid
    React.useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    // 3. Filter data
    const filteredHistoricalData = useMemo(() => {
        if (!selectedYear) return [];
        let data = historicalData.filter(d => d.academicYear === selectedYear);
        if (selectedSubject !== 'All') {
            data = data.filter(d => d.subject === selectedSubject);
        }
        return data;
    }, [historicalData, selectedYear, selectedSubject]);

    const filteredCurrentData = useMemo(() => {
        if (selectedSubject === 'All') return currentData;
        return currentData.filter(d => d.subject === selectedSubject);
    }, [currentData, selectedSubject]);

    // Extract unique subjects
    const availableSubjects = useMemo(() => {
        const subjects = new Set([
            ...currentData.map(d => d.subject),
            ...historicalData.map(d => d.subject)
        ]);
        return Array.from(subjects).filter(Boolean).sort();
    }, [currentData, historicalData]);

    if (!historicalData || historicalData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Historical Data Available</h3>
                <p className="text-gray-500 max-w-md">
                    We couldn't find any historical assessment data to compare against.
                    Please ensure the spreadsheet contains columns properly formatted as "Subject YY/YY".
                </p>
            </div>
        );
    }

    // 4. Drill Down State
    const [drillDownData, setDrillDownData] = useState(null); // { subject, category, students }

    const handleDrillDown = (subject, category, students) => {
        setDrillDownData({ subject, category, students });
        // Scroll to table if needed
    };

    // Reset drill down when filters change
    React.useEffect(() => {
        setDrillDownData(null);
    }, [selectedYear, selectedSubject]);

    return (
        <div className="space-y-6">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center justify-end gap-4">
                {/* Year Selector */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <Calendar className="w-4 h-4 text-gray-400 ml-2" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-gray-700 focus:ring-0 cursor-pointer"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Subject Selector */}
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <Filter className="w-4 h-4 text-gray-400 ml-2" />
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="bg-transparent border-none text-xs font-bold text-gray-700 focus:ring-0 cursor-pointer min-w-[120px]"
                    >
                        <option value="All">All Subjects</option>
                        {availableSubjects.map(subj => (
                            <option key={subj} value={subj}>{subj}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Score Cards */}
            {selectedYear && (
                <div>
                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                        <Filter className="w-4 h-4" />
                        Showing progress from <strong>{selectedYear}</strong> to <strong>Current</strong>
                        {selectedSubject !== 'All' && <span> for <strong>{selectedSubject}</strong></span>}
                    </div>
                    <ProgressScoreCards
                        currentData={filteredCurrentData}
                        historicalData={filteredHistoricalData}
                        onDrillDown={handleDrillDown}
                    />
                </div>
            )}

            {/* Drill Down Table */}
            {drillDownData && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                        <div>
                            <h3 className="font-bold text-lg text-gray-900">
                                {drillDownData.subject} - {drillDownData.category}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {drillDownData.students.length} Students found
                            </p>
                        </div>
                        <button
                            onClick={() => setDrillDownData(null)}
                            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <span className="sr-only">Close</span>
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Student Name</th>
                                    <th className="px-6 py-4">Historical Grade ({selectedYear})</th>
                                    <th className="px-6 py-4">Current Grade</th>
                                    <th className="px-6 py-4 text-center">Movement</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {drillDownData.students.map((student, idx) => (
                                    <tr key={student.upn || idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{student.name}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                                                {student.historicalGrade}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${student.progressStatus === 'Better than Expected' ? 'bg-green-50 text-green-700' :
                                                student.progressStatus === 'Less than Expected' ? 'bg-orange-50 text-orange-700' :
                                                    'bg-blue-50 text-blue-700'
                                                }`}>
                                                {student.currentGrade}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {student.progressStatus === 'Better than Expected' ? (
                                                <span className="inline-flex items-center text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded-full">
                                                    Better <TrendingUp className="w-3 h-3 ml-1" />
                                                </span>
                                            ) : student.progressStatus === 'Less than Expected' ? (
                                                <span className="inline-flex items-center text-orange-500 font-medium text-xs bg-orange-50 px-2 py-1 rounded-full">
                                                    Less <TrendingUp className="w-3 h-3 ml-1 rotate-180" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-blue-600 font-medium text-xs bg-blue-50 px-2 py-1 rounded-full">
                                                    Expected <span className="ml-1 text-lg leading-none">−</span>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
