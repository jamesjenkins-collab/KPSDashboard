import React, { useMemo, useState } from 'react';
import {
    User, Calendar, AlertTriangle, BookOpen, ChevronLeft,
    TrendingUp, TrendingDown, Clock, Info, GraduationCap,
    MapPin, Phone, Mail, Award, Trophy, Heart, Brain
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend, ReferenceLine
} from 'recharts';

export function StudentProfileView({
    student,
    attemptedUpn,
    data = [],
    attendance = [],
    behaviour = [],
    nfer = [],
    culturalCapital = [],
    clubs = [],
    leadership = [],
    onBack
}) {
    const [activeTab, setActiveTab] = useState('overview');

    const getUpn = (obj) => {
        if (!obj) return null;
        const keys = Object.keys(obj);
        const upnKey = keys.find(k => k.toLowerCase() === 'upn') || keys.find(k => k.toLowerCase().includes('upn'));
        return upnKey ? String(obj[upnKey]).trim() : null;
    };

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-200 shadow-sm text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-6">
                    <User className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Student Not Found</h2>
                <p className="text-gray-500 mb-6">We couldn't find a student in the database matching this UPN: {attemptedUpn}</p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" /> Back
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header / Navigation */}
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">
                        UPN: {getUpn(student) || 'N/A'}
                    </span>
                </div>
            </div>

            {/* Profile Hero */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex items-end -mt-12 mb-6">
                        <div className="bg-white p-2 rounded-2xl shadow-lg">
                            <div className="w-24 h-24 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <User className="w-12 h-12" />
                            </div>
                        </div>
                        <div className="ml-6 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
                            <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1 text-gray-500 font-medium">
                                    <GraduationCap className="w-4 h-4" />
                                    Year {student.yearGroup} • {student.registrationForm}
                                </span>
                                <div className="flex items-center gap-2">
                                    {student.sEN === 'Yes' && (
                                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">SEN</span>
                                    )}
                                    {student.pupilPremium === 'Yes' && (
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-bold rounded">PP</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} label="Overview" icon={Info} />
                        <TabButton active={activeTab === 'cultural'} onClick={() => setActiveTab('cultural')} label="Cultural Capital" icon={Trophy} />
                        <TabButton active={activeTab === 'wellbeing'} onClick={() => setActiveTab('wellbeing')} label="Wellbeing" icon={Heart} />
                    </div>

                    <div className="mt-8">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <SummaryCard
                                            label="Attendance"
                                            value={`${student.attendance ? student.attendance.toFixed(1) : '0'}%`}
                                            subtext="Current Academic Year"
                                            color="blue"
                                            icon={Calendar}
                                        />
                                        <SummaryCard
                                            label="Role"
                                            value={student.registrationForm || 'N/A'}
                                            subtext="Class Placement"
                                            color="indigo"
                                            icon={Award}
                                        />
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <Info className="w-5 h-5 text-indigo-600" />
                                            Student Information
                                        </h3>
                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            This pupil is currently in Year {student.yearGroup} in {student.registrationForm}. 
                                            {student.pupilPremium === 'Yes' ? ' They are eligible for Pupil Premium funding. ' : ''}
                                            {student.sEN === 'Yes' ? ' They have recorded Special Educational Needs. ' : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Demographics</h3>
                                        <ul className="space-y-4">
                                            <DetailItem label="Sex" value={student.sex || '-'} />
                                            <DetailItem label="Ethnicity" value={student.ethnicity || '-'} />
                                            <DetailItem label="SEN" value={student.sEN || 'No'} />
                                            <DetailItem label="Pupil Premium" value={student.pupilPremium || 'No'} />
                                            <DetailItem label="EAL" value={student.eAL || 'No'} />
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'cultural' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Trips & Clubs Section */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Enrichment & Trips</h3>
                                                <p className="text-xs text-gray-500">Academic Year Participation</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Trips Attended</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {student.tripsThisAcademicYear ? (
                                                        student.tripsThisAcademicYear.split(',').map((trip, i) => (
                                                            <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full border border-indigo-100 italic">
                                                                {trip.trim()}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">No trips recorded for this academic year.</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">After-School Clubs</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {student.clubsThisAcademicYear ? (
                                                        student.clubsThisAcademicYear.split(',').map((club, i) => (
                                                            <span key={i} className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full border border-purple-100">
                                                                {club.trim()}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-sm text-gray-400 italic">No clubs recorded.</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Leadership & Talents */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                                <Trophy className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">Leadership & Talents</h3>
                                                <p className="text-xs text-gray-500">Skills and Contributions</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 flex items-start gap-3">
                                                <GraduationCap className="w-5 h-5 text-amber-600 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Leadership Role</span>
                                                    <p className="text-gray-900 font-bold">
                                                        {student.leadershipRole || 'No leadership role recorded'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-3">
                                                <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-1">Musical Instrument</span>
                                                    <p className="text-gray-900 font-bold">
                                                        {student.musicalInstrumentPlayed || 'None recorded'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Placeholder for Detailed Attendance/Behaviour */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
                                        <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                                        <h4 className="font-bold text-gray-900 mb-1">Attendance Breakdown</h4>
                                        <p className="text-sm text-gray-500">Detailed session-by-session data coming soon.</p>
                                    </div>
                                    <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-12 text-center">
                                        <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-4" />
                                        <h4 className="font-bold text-gray-900 mb-1">Behaviour Incidents</h4>
                                        <p className="text-sm text-gray-500">Log of specific incidents and patterns coming soon.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'wellbeing' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                {/* Current Summary */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SummaryCard 
                                        label="Latest Score" 
                                        value={student.wellbeing?.[0]?.averageScore || 'N/A'} 
                                        subtext="Avg score (1-5)" 
                                        color={parseFloat(student.wellbeing?.[0]?.averageScore) < 3 ? 'red' : 'indigo'}
                                        icon={Heart} 
                                    />
                                    <SummaryCard 
                                        label="Surveys Taken" 
                                        value={student.wellbeing?.length || 0} 
                                        subtext="This Academic Year" 
                                        color="blue"
                                        icon={Clock} 
                                    />
                                    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center gap-4">
                                        <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
                                            <Brain className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-gray-400 uppercase block">Mental Health Status</span>
                                            <span className="text-lg font-bold text-gray-900 block">
                                                {parseFloat(student.wellbeing?.[0]?.averageScore) < 3 ? 'Needs Review' : (student.wellbeing?.length > 0 ? 'Steady' : 'No Data')}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed History */}
                                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-indigo-600" />
                                            Survey History
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {student.wellbeing?.map((entry, idx) => (
                                            <div key={idx} className="p-8 hover:bg-gray-50/50 transition-colors">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{entry.timestamp}</span>
                                                        <h4 className="text-lg font-bold text-gray-900 mt-1">Survey Response</h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">Avg Score</span>
                                                        <span className={`text-sm font-black ${parseFloat(entry.averageScore) < 3 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                            {entry.averageScore}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                                                    {entry.responses.map((resp, rIdx) => (
                                                        <div key={rIdx} className="flex justify-between items-center py-3 border-b border-gray-50 last:border-0 border-dashed">
                                                            <span className="text-sm font-medium text-gray-600 max-w-[70%]">{resp.question}</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                                                    resp.score >= 4 ? 'bg-emerald-50 text-emerald-700' : 
                                                                    resp.score >= 3 ? 'bg-blue-50 text-blue-700' : 
                                                                    'bg-rose-50 text-rose-700'
                                                                }`}>
                                                                    {resp.answer}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {(!student.wellbeing || student.wellbeing.length === 0) && (
                                            <div className="p-20 text-center">
                                                <Info className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No survey responses recorded yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, icon: Icon }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 ${active
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                }`}
        >
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function SummaryCard({ label, value, subtext, color, icon: Icon }) {
    const variants = {
        blue: "bg-blue-50 text-blue-600",
        red: "bg-red-50 text-red-600",
        indigo: "bg-indigo-50 text-indigo-600"
    };
    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex items-start gap-4">
            <div className={`p-2 rounded-lg ${variants[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <span className="text-xs font-bold text-gray-400 uppercase block">{label}</span>
                <span className="text-xl font-bold text-gray-900 block">{value}</span>
                <span className="text-[10px] text-gray-500">{subtext}</span>
            </div>
        </div>
    );
}

function DetailItem({ label, value }) {
    return (
        <li className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <span className="text-sm font-bold text-gray-900">{value}</span>
        </li>
    );
}
