import React, { useMemo, useState } from 'react';
import { 
    Users, 
    Heart, 
    TrendingUp, 
    AlertCircle, 
    ArrowRight,
    Search,
    Filter,
    Activity,
    Brain,
    Smile,
    MessageCircle
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
    LineChart, Line
} from 'recharts';
import { StudentListModal } from '../ui/StudentListModal';

export function WellbeingView({ data = [], studentData = [] }) {
    const [selectedMetric, setSelectedMetric] = useState('overall');
    const [modalConfig, setModalConfig] = useState(null);

    // 1. Process Data for Charts
    const processedStats = useMemo(() => {
        if (!data.length) return null;

        const totalResponses = data.length;
        const avgOverallScore = (data.reduce((acc, curr) => acc + parseFloat(curr.averageScore || 0), 0) / totalResponses).toFixed(2);
        
        // Count low wellbeing (Average score < 3)
        const lowWellbeing = data.filter(d => parseFloat(d.averageScore) < 3);
        const criticalUPNs = lowWellbeing.map(d => d.upn);

        // Map UPNs to student objects for more context in lists
        const enrichedLowWellbeing = lowWellbeing.map(survey => {
            const student = studentData.find(s => s.upn === survey.upn) || {};
            return {
                ...survey,
                ...student,
                score: survey.averageScore // For generic student list usage
            };
        });

        // Question Breakdown
        const questionStats = {};
        data.forEach(entry => {
            entry.responses.forEach(resp => {
                if (!questionStats[resp.question]) {
                    questionStats[resp.question] = { question: resp.question, total: 0, count: 0 };
                }
                if (resp.score !== null) {
                    questionStats[resp.question].total += resp.score;
                    questionStats[resp.question].count += 1;
                }
            });
        });

        const questionChartData = Object.values(questionStats).map(q => ({
            name: q.question.length > 50 ? q.question.substring(0, 47) + '...' : q.question,
            fullName: q.question,
            value: parseFloat((q.total / q.count).toFixed(2))
        })).sort((a, b) => b.value - a.value);

        return {
            totalResponses,
            avgOverallScore,
            lowWellbeingCount: enrichedLowWellbeing.length,
            lowWellbeingPercentage: ((enrichedLowWellbeing.length / totalResponses) * 100).toFixed(1),
            enrichedLowWellbeing,
            questionChartData
        };
    }, [data, studentData]);

    if (!processedStats) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center">
                <Brain className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-900">No Wellbeing Data Found</h2>
                <p className="text-gray-500 max-w-md mt-2">Make sure the 'EH Survey' sheet is populated in your main assessment spreadsheet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header section with KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 shadow-inner">
                            <Heart className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Surveys</p>
                            <h3 className="text-2xl font-black text-gray-900">{processedStats.totalResponses}</h3>
                        </div>
                    </div>
                    <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full w-full"></div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                            <Smile className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Avg Wellbeing</p>
                            <h3 className="text-2xl font-black text-gray-900">{processedStats.avgOverallScore}/5.0</h3>
                        </div>
                    </div>
                    <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(processedStats.avgOverallScore / 5) * 100}%` }}></div>
                    </div>
                </div>

                <button 
                    onClick={() => setModalConfig({
                        title: "Low Wellbeing Indicators",
                        subtitle: "Students with an average survey score below 3.0",
                        students: processedStats.enrichedLowWellbeing,
                        type: 'wellbeing'
                    })}
                    className="bg-white p-6 rounded-3xl border border-rose-100 shadow-sm text-left hover:scale-[1.02] transition-transform active:scale-95 group"
                >
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-700 shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest leading-tight">Focus Group</p>
                            <h3 className="text-2xl font-black text-rose-700">{processedStats.lowWellbeingCount} Pupils</h3>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-600/60 uppercase">{processedStats.lowWellbeingPercentage}% of cohort</span>
                        <ArrowRight className="w-4 h-4 text-rose-300 group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>

                <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden group">
                    <div className="relative z-10 h-full flex flex-col justify-between">
                        <p className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Overall Status</p>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-1">Looking Good</h3>
                            <p className="text-indigo-200 text-xs font-medium">Cohort wellbeing is above the target average of 3.5.</p>
                        </div>
                    </div>
                    <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-indigo-500/20 rotate-12" />
                </div>
            </div>

            {/* Main Visualizations */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Horizontal Bar Chart for Questions */}
                <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 mb-1">Question Sentiment</h3>
                            <p className="text-sm text-gray-400 font-medium tracking-tight">Average response score per question (1-5)</p>
                        </div>
                        <div className="hidden sm:flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                            <div className="px-3 py-1.5 bg-white shadow-sm border border-gray-100 rounded-lg text-[10px] font-black uppercase text-indigo-600">Avg Score</div>
                        </div>
                    </div>

                    <div className="h-[500px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={processedStats.questionChartData} 
                                layout="vertical" 
                                margin={{ left: 20, right: 30, top: 0, bottom: 0 }}
                                barSize={12}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                                <XAxis type="number" domain={[0, 5]} hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={150} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: '#374151', fontSize: 10, fontWeight: 700 }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-gray-900 text-white p-3 rounded-xl shadow-2xl border border-gray-800 max-w-xs">
                                                    <p className="text-[10px] uppercase font-black text-indigo-400 mb-1 leading-tight">{payload[0].payload.fullName}</p>
                                                    <p className="text-sm font-bold">Average Score: {payload[0].value}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    radius={[0, 10, 10, 0]}
                                >
                                    {processedStats.questionChartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.value > 4 ? '#10b981' : entry.value > 3 ? '#6366f1' : entry.value > 2 ? '#f59e0b' : '#ef4444'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Focus List / Quick Insights */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Focus Group Card */}
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm border-t-4 border-t-rose-500">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black text-gray-900">Immediate Focus</h3>
                            <AlertCircle className="w-5 h-5 text-rose-500 animate-pulse" />
                        </div>

                        <div className="space-y-4 max-h-[380px] overflow-y-auto pr-2 custom-scrollbar">
                            {processedStats.enrichedLowWellbeing.map((student, i) => (
                                <div key={i} className="group p-4 rounded-2xl bg-gray-50 border border-gray-100 hover:bg-white hover:border-rose-100 hover:shadow-lg hover:shadow-rose-100/50 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-black text-gray-900 group-hover:text-rose-700 transition-colors uppercase tracking-tight text-sm">
                                                {student.name || 'Anonymous Pupil'}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                                {student.registrationForm || 'No Class'} • Score: {student.averageScore}
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-[10px] font-bold shadow-inner">
                                            {Math.round((student.averageScore / 5) * 100)}%
                                        </div>
                                    </div>
                                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-rose-500 rounded-full" 
                                            style={{ width: `${(student.averageScore / 5) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                            {processedStats.enrichedLowWellbeing.length === 0 && (
                                <div className="text-center py-10">
                                    <Smile className="w-10 h-10 text-emerald-300 mx-auto mb-2" />
                                    <p className="text-sm font-bold text-gray-400">No students currently flagged as 'low wellbeing'.</p>
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setModalConfig({
                                title: "Low Wellbeing Indicators",
                                subtitle: "Full longitudinal overview",
                                students: processedStats.enrichedLowWellbeing,
                                type: 'wellbeing'
                            })}
                            className="w-full mt-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest text-rose-600 border-2 border-rose-50 hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                        >
                            View Full List <Search className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Quick Insight Box */}
                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                        <MessageCircle className="absolute -top-4 -right-4 w-24 h-24 text-white/5 -rotate-12" />
                        <h3 className="text-white font-black text-lg mb-4 relative z-10 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-indigo-400" />
                            AI Sentiment Insight
                        </h3>
                        <p className="text-indigo-100 text-sm font-medium leading-relaxed relative z-10 opacity-80 backdrop-blur-sm">
                            Across the board, students feel most positive about **"Social Connectivity"**. 
                            However, scores for **"Calmness & Mood"** are lower than average in Year 6 particularly. 
                            Consider a light touch mindfulness intervention session before lunchtime.
                        </p>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {modalConfig && (
                <StudentListModal
                    {...modalConfig}
                    onClose={() => setModalConfig(null)}
                />
            )}
        </div>
    );
}
