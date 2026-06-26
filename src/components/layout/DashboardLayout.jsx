import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export function DashboardLayout({
    children,
    filters = {},
    onFilterChange = () => { },
    availableFilters = { yearGroups: [], subjects: [], terms: [], sex: [] },
    currentView,
    onNavigate,
}) {
    // Hide sidebar ONLY on the main home landing page
    const showSidebar = currentView !== 'home';

    return (
        <div className="flex flex-col min-h-screen bg-gray-50 h-screen overflow-hidden">
            <Navbar
                currentView={currentView}
                onNavigate={onNavigate}
            />

            <div className="flex flex-1 overflow-hidden">
                {showSidebar && (
                    <Sidebar
                        className="hidden md:flex flex-shrink-0"
                        filters={filters}
                        onFilterChange={onFilterChange}
                        availableFilters={availableFilters}
                        currentView={currentView}
                        onNavigate={onNavigate}
                    />
                )}

                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gray-50">
                    <div className="max-w-[1600px] mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
