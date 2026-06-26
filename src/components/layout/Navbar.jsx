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
    Search,
    Bell,
    ChevronDown,
    Menu,
    Home
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { cn } from '../../lib/utils';

export function Navbar({ currentView, onNavigate }) {
    const navItems = [
        { id: 'cat_inclusion', label: 'Inclusion', icon: Users },
        { id: 'cat_curriculum', label: 'Curriculum', icon: BookOpen },
        { id: 'cat_achievement', label: 'Achievement', icon: TrendingUp },
        { id: 'cat_attendance_behaviour', label: 'Attendance', icon: Calendar },
        { id: 'cat_personal_development', label: 'Personal Dev', icon: Heart },
        { id: 'cat_leadership', label: 'Leadership', icon: Building2 },
        { id: 'cat_early_years', label: 'Early Years', icon: Baby },
        { id: 'cat_safeguarding', label: 'Safeguarding', icon: ShieldCheck },
    ];

    return (
        <nav className="bg-white border-b border-gray-100 flex-shrink-0 z-50 sticky top-0">
            <div className="max-w-[1700px] mx-auto px-4 h-20 flex items-center justify-between gap-4">
                {/* Left: Brand */}
                <div className="flex items-center gap-6 shrink-0">
                    <button 
                        onClick={() => onNavigate('home')}
                        className="flex items-center gap-3 group"
                    >
                        <img src={logo} alt="School Logo" className="h-10 w-auto object-contain transition-transform group-hover:scale-105" />
                        <div className="hidden lg:block text-left">
                            <h1 className="text-lg font-black text-gray-900 leading-tight">Kensington</h1>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Dashboard</p>
                        </div>
                    </button>
                    <div className="h-8 w-px bg-gray-100 hidden md:block" />
                </div>

                {/* Center: Main Navigation */}
                <div className="hidden xl:flex items-center gap-1 flex-1 justify-center">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id || (currentView?.startsWith('cat_') && currentView === item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => onNavigate(item.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                                    isActive 
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                )}
                            >
                                <item.icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-gray-400")} />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-3 shrink-0">
                    <div className="hidden lg:flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100 mr-2">
                        <button 
                            onClick={() => onNavigate('home')}
                            className={cn(
                                "p-2 rounded-lg transition-all",
                                currentView === 'home' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <Home className="w-4 h-4" />
                        </button>
                    </div>

                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all hidden sm:block">
                        <Bell className="w-5 h-5" />
                    </button>

                    <button className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded-2xl transition-all group border border-transparent hover:border-gray-100">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-100">
                            JD
                        </div>
                        <div className="hidden sm:block text-left mr-1">
                            <p className="text-[11px] font-bold text-gray-900 leading-none mb-0.5">Admin User</p>
                            <div className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter">Online</p>
                            </div>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-900 transition-colors" />
                    </button>

                    <div className="h-8 w-px bg-gray-100 mx-2 hidden sm:block" />

                    <button
                        onClick={() => onNavigate('logout')}
                        className="hidden sm:flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                        Sign Out
                    </button>
                    
                    <button className="xl:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
