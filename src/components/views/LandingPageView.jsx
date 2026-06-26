import React from 'react';
import {
    Users,
    BookOpen,
    TrendingUp,
    Calendar,
    Heart,
    Building2,
    Baby,
    ShieldCheck,
    ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils';

const AreaCard = ({ title, description, icon: Icon, color, onClick, primaryView }) => {
    const colorClasses = {
        blue: "from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 border-blue-200 text-blue-700",
        purple: "from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border-purple-200 text-purple-700",
        green: "from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-200 text-emerald-700",
        orange: "from-orange-500/10 to-amber-500/10 hover:from-orange-500/20 hover:to-amber-500/20 border-orange-200 text-orange-700",
        red: "from-rose-500/10 to-red-500/10 hover:from-rose-500/20 hover:to-red-500/20 border-rose-200 text-rose-700",
        indigo: "from-indigo-500/10 to-violet-500/10 hover:from-indigo-500/20 hover:to-violet-500/20 border-indigo-200 text-indigo-700",
        cyan: "from-cyan-500/10 to-sky-500/10 hover:from-cyan-500/20 hover:to-sky-500/20 border-cyan-200 text-cyan-700",
        slate: "from-slate-500/10 to-gray-500/10 hover:from-slate-500/20 hover:to-gray-500/20 border-slate-200 text-slate-700"
    };

    const iconBgClasses = {
        blue: "bg-blue-100 text-blue-600",
        purple: "bg-purple-100 text-purple-600",
        green: "bg-emerald-100 text-emerald-600",
        orange: "bg-orange-100 text-orange-600",
        red: "bg-rose-100 text-rose-600",
        indigo: "bg-indigo-100 text-indigo-600",
        cyan: "bg-cyan-100 text-cyan-600",
        slate: "bg-slate-100 text-slate-600"
    };

    return (
        <button
            onClick={() => onClick(primaryView)}
            className={cn(
                "relative group flex flex-col p-8 rounded-3xl border-2 transition-all duration-300 text-left bg-gradient-to-br h-full",
                "hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-500/10 active:scale-95",
                colorClasses[color]
            )}
        >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-6", iconBgClasses[color])}>
                <Icon className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold mb-3 text-gray-900">{title}</h3>
            <p className="text-gray-600 leading-relaxed mb-6 flex-grow">{description}</p>

            <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider group-hover:gap-3 transition-all">
                <span>View Insights</span>
                <ArrowRight className="w-4 h-4" />
            </div>

            {/* Decorative background element */}
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="w-24 h-24 -mr-8 -mt-8 rotate-12" />
            </div>
        </button>
    );
};

export function LandingPageView({ onNavigate, stats = {} }) {
    const areas = [
        {
            title: "Inclusion",
            description: "How well the school meets the needs of all children, especially those with SEND or from disadvantaged backgrounds.",
            icon: Users,
            color: "blue",
            primaryView: "cat_inclusion"
        },
        {
            title: "Curriculum & Teaching",
            description: "A combined area assessing what is taught and the quality of classroom instruction across all subjects.",
            icon: BookOpen,
            color: "indigo",
            primaryView: "cat_curriculum"
        },
        {
            title: "Achievement",
            description: "The progress and attainment of pupils compared to national expectations and personal targets.",
            icon: TrendingUp,
            color: "purple",
            primaryView: "cat_achievement"
        },
        {
            title: "Attendance & Behaviour",
            description: "How well the school manages student conduct and addresses school absence and engagement.",
            icon: Calendar,
            color: "orange",
            primaryView: "cat_attendance_behaviour"
        },
        {
            title: "Personal Development",
            description: "The school's efforts to support students' broader growth, mental health, and cultural capital.",
            icon: Heart,
            color: "red",
            primaryView: "cat_personal_development"
        },
        {
            title: "Leadership & Governance",
            description: "The effectiveness of the school's leadership team and its governing body in driving standards.",
            icon: Building2,
            color: "slate",
            primaryView: "cat_leadership"
        },
        {
            title: "Early Years",
            description: "A specialized focus on the development and progress of children in Nursery and Reception.",
            icon: Baby,
            color: "green",
            primaryView: "cat_early_years"
        },
        {
            title: "Safeguarding",
            description: "Ensuring the safety and well-being of all students is the school's highest priority. Judgement: MET.",
            icon: ShieldCheck,
            color: "cyan",
            primaryView: "cat_safeguarding"
        }
    ];

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-16">
                <h1 className="text-5xl font-extrabold text-gray-900 mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Kensington Dashboard
                </h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    Select a core area to dive deep into performance metrics, trends, and student insights.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {areas.map((area, index) => (
                    <AreaCard
                        key={area.title}
                        {...area}
                        onClick={onNavigate}
                    />
                ))}
            </div>

            <div className="mt-20 p-8 rounded-[40px] bg-indigo-900 text-white relative overflow-hidden group shadow-2xl">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-xl text-center md:text-left">
                        <h2 className="text-3xl font-bold mb-4">Overall Effectiveness</h2>
                        <p className="text-indigo-100 text-lg">
                            The school continues to demonstrate high standards across all core areas.
                            Our focus remains on inclusive excellence and exceptional student outcomes.
                        </p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-black mb-1">MET</div>
                            <div className="text-xs uppercase tracking-widest text-indigo-300 font-bold">Safeguarding</div>
                        </div>
                        <div className="w-px h-12 bg-indigo-500/50" />
                        <button
                            onClick={() => onNavigate('dashboard')}
                            className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-bold hover:bg-indigo-50 transition-colors shadow-lg active:scale-95"
                        >
                            Executive Summary
                        </button>
                    </div>
                </div>

                {/* Decorative background blast */}
                <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
                <div className="absolute -left-20 -top-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000 delay-150" />
            </div>
        </div>
    );
}
