import React from 'react';

export function AssessmentView({ data }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Assessment Data</h3>
                <p className="text-gray-500 max-w-sm">
                    No results found matching the current filters. Please ensure you have selected a Subject and Term from the sidebar.
                </p>
            </div>
        );
    }

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'yearGroup', label: 'Year' },
        { key: 'registrationForm', label: 'Class' },
        { key: 'pupilPremium', label: 'PP' },
        { key: 'sen', label: 'SEN' },
        { key: 'subject', label: 'Subject' },
        { key: 'term', label: 'Term' },
        { key: 'score', label: 'Grade' },
    ];

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                {columns.map(col => (
                                    <td key={col.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {col.key === 'score' ? (
                                            <span className="font-bold">{row[col.key]}</span>
                                        ) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
                Showing {data.length} assessment snapshots
            </div>
        </div>
    );
}
