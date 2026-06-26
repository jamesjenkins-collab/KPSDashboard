import { useState } from 'react';
import { Target as TargetIcon } from 'lucide-react';
import { StudentListModal } from '../ui/StudentListModal';

export function BelowTargetCard({ data, fullData }) {
    const [selectedTerm, setSelectedTerm] = useState('Autumn');
    const [showModal, setShowModal] = useState(false);

    // Get available terms (exclude target term) - use fullData to see all terms
    const availableTerms = [...new Set((fullData || data).map(d => d.term))]
        .filter(term => !term.includes('Target') && !term.includes('Baseline'))
        .sort();

    // Calculate students below target
    const getStudentsBelowTarget = () => {
        const targetTerm = 'Actual Target (2025/2026)';
        const belowTargetStudents = [];

        // Group data by student and subject - use filtered data for demographics
        const studentSubjects = {};
        data.forEach(row => {
            const key = `${row.name}|${row.subject}`;
            if (!studentSubjects[key]) {
                studentSubjects[key] = {
                    name: row.name,
                    subject: row.subject,
                    yearGroup: row.yearGroup,
                    pupilPremium: row.pupilPremium,
                    sen: row.sEN,
                    sEN: row.sEN, // ensure both cases
                    eal: row.eAL,
                    eAL: row.eAL
                };
            }

            // Store actual score for selected term
            if (row.term === selectedTerm) {
                studentSubjects[key].actualScore = row.score;
                studentSubjects[key].actualTerm = row.term;
            }
        });

        // Get targets from fullData to ensure we have them even with term filters
        (fullData || data).forEach(row => {
            const key = `${row.name}|${row.subject}`;
            // Only add target if this student-subject combo exists in filtered data
            if (studentSubjects[key] && row.term === targetTerm) {
                studentSubjects[key].targetScore = row.score;
            }
        });

        // Find students where actual < target
        Object.values(studentSubjects).forEach(student => {
            if (student.actualScore !== undefined && student.targetScore !== undefined) {
                if (student.actualScore < student.targetScore) {
                    belowTargetStudents.push({
                        ...student,
                        gap: student.targetScore - student.actualScore
                    });
                }
            }
        });

        return belowTargetStudents.sort((a, b) => b.gap - a.gap);
    };

    const belowTargetStudents = getStudentsBelowTarget();
    const totalComparisons = data.filter(d => d.term === selectedTerm).length;
    const percentageBelowTarget = totalComparisons > 0
        ? ((belowTargetStudents.length / totalComparisons) * 100).toFixed(1)
        : 0;

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <TargetIcon className="w-5 h-5 text-orange-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Students Below Target</h3>
                    </div>

                    {/* Term Selector */}
                    <select
                        value={selectedTerm}
                        onChange={(e) => setSelectedTerm(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {availableTerms.map(term => (
                            <option key={term} value={term}>{term}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <p className="text-xs text-gray-500">
                        Comparing {selectedTerm} actual scores vs Actual Target (2025/2026)
                    </p>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-orange-50 rounded-lg p-4">
                        <div className="text-xs font-medium text-orange-600 mb-1">Below Target</div>
                        <div className="text-3xl font-bold text-orange-700">{belowTargetStudents.length}</div>
                        <div className="text-xs text-orange-600 mt-1">
                            {percentageBelowTarget}% of students
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                        <div className="text-xs font-medium text-green-600 mb-1">On or Above Target</div>
                        <div className="text-3xl font-bold text-green-700">
                            {totalComparisons - belowTargetStudents.length}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                            {(100 - parseFloat(percentageBelowTarget)).toFixed(1)}% of students
                        </div>
                    </div>
                </div>

                {/* View Details Button */}
                <button
                    onClick={() => setShowModal(true)}
                    disabled={belowTargetStudents.length === 0}
                    className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${belowTargetStudents.length > 0
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {belowTargetStudents.length > 0
                        ? `View ${belowTargetStudents.length} Students Below Target`
                        : 'All Students Meeting Targets 🎉'
                    }
                </button>
            </div>

            {/* Modal */}
            {showModal && (
                <StudentListModal
                    title={`Students Below Target - ${selectedTerm}`}
                    subtitle={`${belowTargetStudents.length} students not meeting their target scores`}
                    students={belowTargetStudents}
                    onClose={() => setShowModal(false)}
                    type="gap"
                />
            )}
        </>
    );
}
