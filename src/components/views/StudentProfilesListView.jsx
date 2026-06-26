import { useState, useMemo } from 'react';
import { Search, User, ChevronRight, Filter, GraduationCap } from 'lucide-react';

export function StudentProfilesListView({ data, onStudentClick }) {
    const [searchTerm, setSearchTerm] = useState('');

    // Extract unique students with their latest demographics and attendance
    const students = useMemo(() => {
        const studentMap = new Map();

        // Use a consistent ID approach
        const getUpn = (obj) => {
            if (!obj) return null;
            const keys = Object.keys(obj);
            const upnKey = keys.find(k => k.toLowerCase() === 'upn') || keys.find(k => k.toLowerCase().includes('upn'));
            return upnKey ? String(obj[upnKey]).trim() : null;
        };

        data.forEach(row => {
            const upn = getUpn(row);
            const id = upn || row.name;

            if (id && !studentMap.has(id)) {
                // Parse attendance
                let att = 0;
                if (typeof row.attendance === 'string') {
                    const parsed = parseFloat(row.attendance.replace('%', ''));
                    att = parsed <= 2 ? (parsed * 100) : parsed;
                } else if (typeof row.attendance === 'number') {
                    att = row.attendance <= 2 ? (row.attendance * 100) : row.attendance;
                }

                studentMap.set(id, {
                    upn: upn,
                    name: row.name,
                    yearGroup: row.yearGroup,
                    registrationForm: row.registrationForm,
                    sEN: row.sEN || row.sen,
                    pupilPremium: row.pupilPremium,
                    eAL: row.eAL || row.eal,
                    attendance: att,
                    ethnicity: row.ethnicity
                });
            }
        });

        return Array.from(studentMap.values()).sort((a, b) => {
            if (a.yearGroup !== b.yearGroup) return String(a.yearGroup).localeCompare(String(b.yearGroup));
            return a.name.localeCompare(b.name);
        });
    }, [data]);

    const filteredStudents = useMemo(() => {
        return students.filter(s =>
            (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.upn && s.upn.includes(searchTerm)) ||
            (s.registrationForm && s.registrationForm.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [students, searchTerm]);

    const getAttendanceColor = (val) => {
        if (val >= 95) return 'text-green-600 bg-green-50';
        if (val >= 90) return 'text-orange-600 bg-orange-50';
        return 'text-red-600 bg-red-50';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* No local header needed as Navbar handles context and search */}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                    <div
                        key={student.upn || student.name}
                        onClick={() => onStudentClick(student.upn)}
                        className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    {(student.name || '?').charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                        {student.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        Year {student.yearGroup} • {student.registrationForm}
                                    </p>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-md text-xs font-bold ${getAttendanceColor(student.attendance)}`}>
                                {student.attendance ? student.attendance.toFixed(1) : '0'}%
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {student.sEN === 'Yes' && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded uppercase">SEN</span>
                            )}
                            {student.pupilPremium === 'Yes' && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded uppercase">PP</span>
                            )}
                            {student.eAL === 'Yes' && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">EAL</span>
                            )}
                            {student.ethnicity && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded uppercase">{student.ethnicity}</span>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-indigo-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                            View Full Profile
                            <ChevronRight className="w-4 h-4" />
                        </div>
                    </div>
                ))}
            </div>

            {filteredStudents.length === 0 && (
                <div className="bg-white p-12 rounded-xl text-center border border-dashed border-gray-300">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No students found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters</p>
                </div>
            )}
        </div>
    );
}
