import React from 'react';
import {
    ArrowLeft,
    ArrowRight,
    Users,
    Target,
    BookOpen,
    LayoutDashboard,
    TrendingUp,
    Calendar,
    FileText,
    AlertTriangle,
    Trophy,
    School,
    Baby,
    ShieldCheck,
    Heart,
    Building2
} from 'lucide-react';
import { cn } from '../../lib/utils';

const ItemCard = ({ label, icon: Icon, onClick, color }) => {
    const colorClasses = {
        blue: "border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 text-blue-700",
        indigo: "border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-700",
        purple: "border-purple-100 hover:border-purple-300 hover:bg-purple-50/50 text-purple-700",
        orange: "border-orange-100 hover:border-orange-300 hover:bg-orange-50/50 text-orange-700",
        red: "border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 text-rose-700",
        green: "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50 text-emerald-700",
        cyan: "border-cyan-100 hover:border-cyan-300 hover:bg-cyan-50/50 text-cyan-700",
        slate: "border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
    };

    return (
        <button
            onClick={onClick}
            className={cn(
                "group flex flex-col p-8 rounded-3xl border-2 transition-all duration-300 text-left bg-white",
                "hover:scale-[1.03] hover:shadow-xl active:scale-95",
                colorClasses[color] || colorClasses.indigo
            )}
        >
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Icon className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold mb-2 text-gray-900">{label}</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Click to explore this area in detail.</p>

            <div className="mt-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 group-hover:gap-3 transition-all">
                <span>Open View</span>
                <ArrowRight className="w-4 h-4" />
            </div>
        </button>
    );
};

export function CategoryLandingView({ categoryId, onNavigate, onBack }) {
    const categoryData = {
        'cat_inclusion': {
            title: "Inclusion",
            description: "Deep dive into pupil demographics, SEND support, and disadvantaged groups.",
            color: "blue",
            items: [
                { id: 'studentProfiles', label: 'Pupil Profiles', icon: Users },
                { id: 'pupilPremium', label: 'Pupil Premium', icon: Target },
            ]
        },
        'cat_curriculum': {
            title: "Curriculum & Teaching",
            description: "Explore subject deep dives and the quality of classroom instruction.",
            color: "indigo",
            items: [
                { id: 'subjectAnalysis', label: 'Subject Deep Dive', icon: BookOpen },
            ]
        },
        'cat_achievement': {
            title: "Achievement",
            description: "Track progress, attainment, and national standard benchmarks.",
            color: "purple",
            items: [
                { id: 'dashboard', label: 'Assessment Dashboard', icon: LayoutDashboard },
                { id: 'progress', label: 'Progress Tracking', icon: TrendingUp },
                { id: 'statutoryAssessments', label: 'Statutory Assessments', icon: Trophy },
            ]
        },
        'cat_attendance_behaviour': {
            title: "Attendance & Behaviour",
            description: "Monitor student engagement, conduct, and attendance metrics.",
            color: "orange",
            items: [
                { id: 'dashboard', label: 'Attendance Patterns', icon: Calendar },
                { id: 'progress', label: 'Welfare Tracking', icon: Heart },
            ]
        },
        'cat_personal_development': {
            title: "Personal Development",
            description: "Supporting students' broader growth, mental health, and extracurricular life.",
            color: "red",
            items: [
                { id: 'culturalCapital', label: 'Cultural Capital', icon: Trophy },
                { id: 'wellbeing', label: 'Student Wellbeing', icon: Heart },
            ]
        },
        'cat_leadership': {
            title: "Leadership & Governance",
            description: "School context, governance data, and leadership effectiveness.",
            color: "slate",
            items: [
                { id: 'schoolContext', label: 'School Context', icon: School },
            ]
        },
        'cat_early_years': {
            title: "Early Years",
            description: "Tracking the developmental milestones of our youngest learners.",
            color: "green",
            items: [
                { id: 'eyfs', label: 'EYFS Tracker', icon: Baby },
            ]
        },
        'cat_safeguarding': {
            title: "Safeguarding",
            description: "Ensuring student safety and robust safeguarding standards.",
            color: "cyan",
            items: [
                { id: 'studentProfiles', label: 'Safeguarding Audit', icon: ShieldCheck },
            ]
        }
    };

    const category = categoryData[categoryId];

    if (!category) {
        return (
            <div className="p-12 text-center text-gray-500">
                Invalid category selected.
                <button onClick={onBack} className="block mx-auto mt-4 text-indigo-600 font-bold">Return Home</button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="mb-12">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors mb-8 font-medium group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Hub</span>
                </button>

                <h1 className="text-4xl font-extrabold text-gray-900 mb-4">{category.title}</h1>
                <p className="text-xl text-gray-500">{category.description}</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {category.items.map((item) => (
                    <ItemCard
                        key={item.id}
                        {...item}
                        color={category.color}
                        onClick={() => onNavigate(item.id)}
                    />
                ))}
            </div>

            {/* Hint Box */}
            <div className="mt-16 p-8 rounded-3xl bg-gray-100 border border-gray-200">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-200 shrink-0">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-900 mb-1">Navigation Tip</h4>
                        <p className="text-gray-600">
                            You can also switch between core areas and their respective views using the top navigation bar at any time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
