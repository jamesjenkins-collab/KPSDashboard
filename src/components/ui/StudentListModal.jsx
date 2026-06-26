import { X } from 'lucide-react';
import { getScoreLabel } from '../../lib/scoreUtils';

export function StudentListModal({ title, subtitle, students, onClose, type = 'gap' }) {
    if (!students || students.length === 0) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 bg-indigo-50">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                            {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Student Name</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Actual</th>
                                {type === 'gap' && <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Target</th>}
                                {type === 'gap' && <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Gap</th>}
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Year Group</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">PP</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">SEN</th>
                                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">EAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {students.map((student, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{student.subject}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${student.actualScore === 1 || student.score === 1 ? 'bg-red-100 text-red-700' :
                                                student.actualScore === 2 || student.score === 2 ? 'bg-orange-100 text-orange-700' :
                                                    student.actualScore === 3 || student.score === 3 ? 'bg-green-100 text-green-700' :
                                                        'bg-purple-100 text-purple-700'
                                            }`}>
                                            {getScoreLabel(student.actualScore || student.score)}
                                        </span>
                                    </td>
                                    {type === 'gap' && (
                                        <>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                                                    {getScoreLabel(student.targetScore)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-700">
                                                    -{student.gap}
                                                </span>
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-3 text-sm text-gray-600">{student.yearGroup}</td>
                                    <td className="px-4 py-3 text-xs text-center">
                                        <span className={`px-1.5 py-0.5 rounded ${student.pupilPremium === 'Yes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {student.pupilPremium === 'Yes' ? '✓' : ''}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-center">
                                        <span className={`px-1.5 py-0.5 rounded ${student.sEN === 'Yes' || student.sen === 'Yes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {student.sEN === 'Yes' || student.sen === 'Yes' ? '✓' : ''}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-center">
                                        <span className={`px-1.5 py-0.5 rounded ${student.eAL === 'Yes' || student.eal === 'Yes' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {student.eAL === 'Yes' || student.eal === 'Yes' ? '✓' : ''}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
