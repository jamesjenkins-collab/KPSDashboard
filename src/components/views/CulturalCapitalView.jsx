import React, { useMemo } from 'react';
import { Globe, Award, Tent, Users, BarChart, Sliders, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

// Helper functions for cleaning and splitting activity names
const cleanActivityName = (name) => {
    if (!name) return "";
    let cleaned = name.toString();
    // Remove all types of asterisks and bullet points
    cleaned = cleaned.replace(/[*\u2022\u2023\u25E6\u2043\u2219\u2731\u2732\u2733]/g, '');
    // Remove day of week prefixes
    cleaned = cleaned.replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s*[-–]\s*/i, '');
    // Remove parenthetical info and clarify separators
    cleaned = cleaned.split('(')[0];
    cleaned = cleaned.split(' - ')[0];
    cleaned = cleaned.split(' – ')[0];
    return cleaned.trim();
};

const splitItems = (val) => {
    if (!val || typeof val !== 'string') return [];



    // Split strategy:
    // 1. Comma (,) is always a separator
    // 2. Semicolon (;) is always a separator
    // 3. " and " (surrounded by spaces) is a separator
    // 4. " & " (surrounded by spaces) is a separator
    // 5. "and*" (and followed immediately by asterisk) is a separator
    // We avoid splitting "V&A" (no spaces)

    // Regex explanation:
    // [,;]  -> matches comma or semicolon
    // |     -> OR
    // \s+and\s+  -> matches " and " with at least one space on each side
    // |
    // \s+&\s+    -> matches " & " with at least one space on each side
    // |
    // \s+and\*   -> matches " and*" (space before, asterisk after)
    // |
    // \band\b(?=\s*\*) -> matches "and" word boundary followed by optional space and asterisk

    const parts = val.split(/[,;]|\s+and\s+|\s+&\s+|\s+and(?=\*)/i);

    return parts
        .map(s => s.trim())
        .filter(s => s && s.toLowerCase() !== 'no' && s.toLowerCase() !== 'false');
};

export function CulturalCapitalView({ data = [], tripsMetadata = { upcoming: [], past: [], all: [] }, sportsTrips = [], fullContextData = [] }) {
    const [selectedMetric, setSelectedMetric] = React.useState(null);
    const [showBreakdown, setShowBreakdown] = React.useState(false);
    const [tripFilter, setTripFilter] = React.useState('all'); // 'all', 'past', 'upcoming'
    const [viewTab, setViewTab] = React.useState('overview'); // 'overview', 'sports'
    const [customFilters, setCustomFilters] = React.useState({
        clubs: false,
        leadership: false,
        trips: false,
        sports: false,
        logic: 'OR'
    });
    const [sortConfig, setSortConfig] = React.useState({ key: 'name', direction: 'asc' });

    // 0. Pre-process Data to include Sports Competitions (via UPN)
    const enrichedData = useMemo(() => {
        if (!data) return [];
        if (!sportsTrips || sportsTrips.length === 0) return data;

        // Build a map of UPN -> Array of Trip Names
        const sportsMap = {};
        sportsTrips.forEach(trip => {
            if (trip.participants) {
                trip.participants.forEach(p => {
                    if (p.upn) {
                        const cleanUpn = p.upn.toString().trim();
                        if (!sportsMap[cleanUpn]) sportsMap[cleanUpn] = [];
                        sportsMap[cleanUpn].push(trip.tripName);
                    }
                });
            }
        });

        return data.map(student => {
            // Fix: Use 'uPN' based on debug logs finding
            const sUpn = student.uPN ? student.uPN.toString().trim() : (student.upn ? student.upn.toString().trim() : "UNKNOWN");
            const sports = sportsMap[sUpn] || [];
            return {
                ...student,
                sportsCompetitions: sports, // Array of strings
                hasSports: sports.length > 0
            };
        });
    }, [data, sportsTrips]);

    // Helper to calculate stats for a group
    const calcStats = (groupData) => {
        if (!groupData || groupData.length === 0) return {
            total: 0,
            clubs: { count: 0, pct: 0 },
            leadership: { count: 0, pct: 0 },
            trips: { count: 0, pct: 0 },
            sports: { count: 0, pct: 0 },
            any: { count: 0, pct: 0 },
            clubsAndLeadership: { count: 0, pct: 0 }
        };

        const total = groupData.length;
        const hasValue = (val) => val && val.toString().trim().length > 0 && val.toString().toLowerCase() !== 'no' && val.toString().toLowerCase() !== 'false';

        // Pre-calculate per student to allow combinations
        const processed = groupData.map(s => ({
            hasClubs: hasValue(s['clubsThisAcademicYear']),
            hasLeadership: hasValue(s['pupilLeadership']),
            hasTrips: hasValue(s['tripsThisAcademicYear']),
            hasSports: s.hasSports // Already computed
        }));

        const clubs = processed.filter(s => s.hasClubs).length;
        const leadership = processed.filter(s => s.hasLeadership).length;
        const trips = processed.filter(s => s.hasTrips).length;
        const sports = processed.filter(s => s.hasSports).length;

        // Combined metrics
        const any = processed.filter(s => s.hasClubs || s.hasLeadership || s.hasTrips || s.hasSports).length;
        const clubsAndLeadership = processed.filter(s => s.hasClubs && s.hasLeadership).length;

        return {
            total,
            clubs: { count: clubs, pct: Math.round((clubs / total) * 100) },
            leadership: { count: leadership, pct: Math.round((leadership / total) * 100) },
            trips: { count: trips, pct: Math.round((trips / total) * 100) },
            sports: { count: sports, pct: Math.round((sports / total) * 100) },
            any: { count: any, pct: Math.round((any / total) * 100) },
            clubsAndLeadership: { count: clubsAndLeadership, pct: Math.round((clubsAndLeadership / total) * 100) },
            custom: { count: 0, pct: 0 } // placeholder
        };
    };

    // Dynamic calc for Custom Filter because it depends on State
    const customStats = useMemo(() => {
        if (!enrichedData || enrichedData.length === 0) return { count: 0, pct: 0 };

        const hasValue = (val) => val && val.toString().trim().length > 0 && val.toString().toLowerCase() !== 'no' && val.toString().toLowerCase() !== 'false';

        const matching = enrichedData.filter(s => {
            const hasClubs = hasValue(s['clubsThisAcademicYear']);
            const hasLeadership = hasValue(s['pupilLeadership']);
            const hasTrips = hasValue(s['tripsThisAcademicYear']);
            const hasSports = s.hasSports;

            const matches = [];
            if (customFilters.clubs) matches.push(hasClubs);
            if (customFilters.leadership) matches.push(hasLeadership);
            if (customFilters.trips) matches.push(hasTrips);
            if (customFilters.sports) matches.push(hasSports);

            // If no filters selected, match none (or all? usually none implies 0)
            if (matches.length === 0) return false;

            if (customFilters.logic === 'AND') {
                return matches.every(m => m);
            } else {
                return matches.some(m => m);
            }
        });

        const count = matching.length;
        return { count, pct: Math.round((count / enrichedData.length) * 100) };

    }, [enrichedData, customFilters]);

    const aggregatedStats = useMemo(() => {
        if (!enrichedData || enrichedData.length === 0) return null;

        const ppStudents = enrichedData.filter(d => d.pupilPremium === 'Yes');
        const nonPpStudents = enrichedData.filter(d => d.pupilPremium !== 'Yes');

        const baseStats = {
            all: calcStats(enrichedData),
            pp: calcStats(ppStudents),
            nonPp: calcStats(nonPpStudents)
        };

        // Inject Custom Stats into 'all'
        baseStats.all.custom = customStats;

        return baseStats;
    }, [data, customStats]);

    // Calculate school-wide PP Benchmark
    const ppBenchmark = useMemo(() => {
        if (!data || data.length === 0) return 0;
        const ppCount = data.filter(d => d.pupilPremium === 'Yes').length;
        return Math.round((ppCount / data.length) * 100);
    }, [data]);

    // Calculate detailed breakdown of activities with PP split
    const activityBreakdown = useMemo(() => {
        if (!enrichedData || enrichedData.length === 0) return null;

        const generateStackedBreakdown = () => {
            const stats = {
                clubs: {},
                leadership: {},
                trips: {},
                sports: {}
            };

            enrichedData.forEach(student => {
                const isPP = student.pupilPremium === 'Yes';

                // Helper to process a field
                const processField = (field, category) => {
                    const val = student[field];
                    if (val) {
                        const items = splitItems(val);
                        items.forEach(item => {
                            const name = cleanActivityName(item);
                            if (!stats[category][name]) {
                                stats[category][name] = { name, total: 0, pp: 0, nonPp: 0 };
                            }
                            stats[category][name].total += 1;
                            if (isPP) stats[category][name].pp += 1;
                            else stats[category][name].nonPp += 1;
                        });
                    }
                };

                processField('clubsThisAcademicYear', 'clubs');
                processField('pupilLeadership', 'leadership');

                // Process Sports (from Enriched Arrays)
                if (student.sportsCompetitions && student.sportsCompetitions.length > 0) {
                    student.sportsCompetitions.forEach(sportName => {
                        const name = cleanActivityName(sportName);
                        if (!stats.sports[name]) {
                            stats.sports[name] = { name, total: 0, pp: 0, nonPp: 0 };
                        }
                        stats.sports[name].total += 1;
                        if (isPP) stats.sports[name].pp += 1;
                        else stats.sports[name].nonPp += 1;
                    });
                }

                // Process Trips with Filtering
                const tripsVal = student['tripsThisAcademicYear'];
                if (tripsVal) {
                    const items = splitItems(tripsVal);
                    items.forEach(item => {
                        const name = cleanActivityName(item);

                        // Filter logic
                        let include = true;
                        if (tripFilter !== 'all') {
                            const relevantTrips = tripsMetadata[tripFilter] || [];
                            const match = relevantTrips.find(t => {
                                const mName = cleanActivityName(t.tripName);
                                return mName === name || t.tripName.trim() === item.trim();
                            });
                            if (!match) include = false;
                        }

                        if (include) {
                            if (!stats.trips[name]) {
                                stats.trips[name] = { name, total: 0, pp: 0, nonPp: 0 };
                            }
                            stats.trips[name].total += 1;
                            if (isPP) stats.trips[name].pp += 1;
                            else stats.trips[name].nonPp += 1;
                        }
                    });
                }
            });

            // Convert to arrays and sort
            const processStats = (obj) => Object.values(obj)
                .map(item => ({
                    ...item,
                    ppPct: Math.round((item.pp / item.total) * 100),
                    nonPpPct: Math.round((item.nonPp / item.total) * 100)
                }))
                .sort((a, b) => b.total - a.total);

            return {
                clubs: processStats(stats.clubs),
                leadership: processStats(stats.leadership),
                trips: processStats(stats.trips),
                sports: processStats(stats.sports)
            };
        };

        return generateStackedBreakdown();
    }, [enrichedData, tripFilter, tripsMetadata]);

    // Filter for the list when a bar or item is clicked
    const drillDownList = useMemo(() => {
        if (!selectedMetric || !enrichedData) return [];

        // selectedMetric structure: { category: 'Clubs', type: 'inverse'|'positive', specificItem: 'Football' (optional), demographic: 'pp'|'nonPp' (optional) }

        const { demographic, category, type = 'inverse', specificItem } = selectedMetric;
        const targetStudents = demographic
            ? (demographic === 'pp' ? enrichedData.filter(d => d.pupilPremium === 'Yes') : enrichedData.filter(d => d.pupilPremium !== 'Yes'))
            : enrichedData;

        const hasValue = (val) => val && val.toString().trim().length > 0 && val.toString().toLowerCase() !== 'no' && val.toString().toLowerCase() !== 'false';

        return targetStudents.filter(s => {
            // 1. Handle "Specific Activity" drill down (always positive)
            if (specificItem) {
                let items = [];
                if (category === 'Clubs') {
                    const val = s['clubsThisAcademicYear'];
                    if (val) items = splitItems(val).map(i => cleanActivityName(i));
                }
                else if (category === 'Leadership') {
                    const val = s['pupilLeadership'];
                    if (val) items = splitItems(val).map(i => cleanActivityName(i));
                }
                else if (category === 'Trips') {
                    const val = s['tripsThisAcademicYear'];
                    if (val) items = splitItems(val).map(i => cleanActivityName(i));
                }
                else if (category === 'Sports') {
                    if (s.sportsCompetitions) items = s.sportsCompetitions.map(i => cleanActivityName(i));
                }

                return items.includes(specificItem);
            }

            // 2. Handle Category Level (Clubs, Leadership, Trips, Sports) AND Combined
            let participates = false;

            if (category === 'Any') {
                participates = hasValue(s['clubsThisAcademicYear']) || hasValue(s['pupilLeadership']) || hasValue(s['tripsThisAcademicYear']) || s.hasSports;
            } else if (category === 'Clubs & Leadership') {
                participates = hasValue(s['clubsThisAcademicYear']) && hasValue(s['pupilLeadership']);
            } else if (category === 'Custom Selection') {
                const hasClubs = hasValue(s['clubsThisAcademicYear']);
                const hasLeadership = hasValue(s['pupilLeadership']);
                const hasTrips = hasValue(s['tripsThisAcademicYear']);
                const hasSports = s.hasSports;

                const matches = [];
                if (customFilters.clubs) matches.push(hasClubs);
                if (customFilters.leadership) matches.push(hasLeadership);
                if (customFilters.trips) matches.push(hasTrips);
                if (customFilters.sports) matches.push(hasSports);

                if (matches.length === 0) {
                    participates = false;
                } else if (customFilters.logic === 'AND') {
                    participates = matches.every(m => m);
                } else {
                    participates = matches.some(m => m);
                }

            } else {
                if (category === 'Sports') {
                    participates = s.hasSports;
                } else {
                    let fieldName = '';
                    if (category === 'Clubs') fieldName = 'clubsThisAcademicYear';
                    if (category === 'Leadership') fieldName = 'pupilLeadership';
                    if (category === 'Trips') fieldName = 'tripsThisAcademicYear';
                    participates = hasValue(s[fieldName]);
                }
            }

            // Return based on type (Inverse vs Positive)
            return type === 'positive' ? participates : !participates;
        });
    }, [enrichedData, selectedMetric, customFilters, tripFilter, tripsMetadata]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedList = useMemo(() => {
        if (!drillDownList) return [];
        let sortableItems = [...drillDownList];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Special handling for name
                if (sortConfig.key === 'name') {
                    const aName = `${a.forename || a.firstName || ''} ${a.surname || a.lastName || ''}`;
                    const bName = `${b.forename || b.firstName || ''} ${b.surname || b.lastName || ''}`;
                    return sortConfig.direction === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
                }

                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [drillDownList, sortConfig]);

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return <div className="w-4 h-4 inline-block" />;
        return sortConfig.direction === 'asc'
            ? <svg className="w-4 h-4 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            : <svg className="w-4 h-4 inline-block text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
    };

    // We no longer need the 'currentBreakdown' logic tied to filters, we use the main activityBreakdown
    const currentBreakdown = activityBreakdown;

    // --- SPORTS TRIPS MATCHING LOGIC ---
    const enrichedSportsTrips = useMemo(() => {
        if (!sportsTrips || sportsTrips.length === 0) return [];

        return sportsTrips.map(trip => {
            const enrichedParticipants = trip.participants.map(p => {
                // Find matching student in fullContextData using UPN
                // p.upn is present from the new App.jsx parsing logic

                let match = null;
                if (fullContextData && fullContextData.length > 0 && p.upn) {
                    match = fullContextData.find(s => s.upn === p.upn);
                }

                return {
                    ...p,
                    // If matched, use student name from context for consistency, else use fallback
                    displayName: match ? `${match.forename || match.firstName} ${match.surname || match.lastName}` : p.name,
                    context: match || null
                };
            });

            // Calculate Stats for this trip
            const total = enrichedParticipants.length;
            const ppCount = enrichedParticipants.filter(p => p.context?.pupilPremium === 'Yes').length;
            const senCount = enrichedParticipants.filter(p => p.context?.sen === 'Yes' || p.context?.sen === 'K' || p.context?.sen === 'E').length;

            return {
                ...trip,
                participants: enrichedParticipants,
                stats: {
                    total,
                    pp: { count: ppCount, pct: total ? Math.round((ppCount / total) * 100) : 0 },
                    sen: { count: senCount, pct: total ? Math.round((senCount / total) * 100) : 0 }
                }
            };
        });
    }, [sportsTrips, fullContextData]);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in p-6">
            {/* Tab Navigation */}
            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex gap-2 w-fit">
                <button
                    onClick={() => setViewTab('overview')}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        viewTab === 'overview'
                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    )}
                >
                    Overview
                </button>
                <button
                    onClick={() => setViewTab('sports')}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        viewTab === 'sports'
                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                    )}
                >
                    Sports Trips
                </button>
            </div>

            {viewTab === 'sports' ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enrichedSportsTrips.map((trip, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <h3 className="font-bold text-gray-900">{trip.tripName}</h3>
                                    <div className="flex gap-3 mt-2 text-xs font-medium text-gray-500">
                                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {trip.stats.total} Pupils</span>
                                        <span className="text-amber-600">PP: {trip.stats.pp.pct}%</span>
                                        <span className="text-indigo-600">SEN: {trip.stats.sen.pct}%</span>
                                    </div>
                                </div>
                                <div className="p-4 max-h-64 overflow-y-auto space-y-2 flex-grow">
                                    {trip.participants.map((p, pIdx) => (
                                        <div key={pIdx} className="flex items-center justify-between text-sm group">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("font-medium", p.context ? "text-gray-900" : "text-gray-400 italic")}>
                                                    {p.displayName || p.name}
                                                </span>
                                                {p.className && <span className="text-xs text-gray-400 border border-gray-100 px-1 rounded">{p.className}</span>}
                                            </div>

                                            {p.context && (
                                                <div className="flex gap-1">
                                                    {p.context.pupilPremium === 'Yes' && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" title="Pupil Premium">PP</span>
                                                    )}
                                                    {(p.context.sen === 'Yes' || p.context.sen === 'K' || p.context.sen === 'E') && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700" title="SEN">SEN</span>
                                                    )}
                                                </div>
                                            )}
                                            {!p.context && <span className="text-[10px] text-red-400" title="Student not found in main data">No Match</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {enrichedSportsTrips.length === 0 && (
                            <div className="col-span-full text-center py-12 text-gray-500 italic">
                                No sports trips data found.
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg">
                                <Globe className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Cultural Capital</h1>
                                <p className="text-gray-500">Enrichment, leadership, and experiences overview.</p>
                            </div>
                        </div>
                    </div>
                    {/* Combined Top Section: Explorer + Stats */}
                    {
                        aggregatedStats && (
                            <div className="flex flex-col gap-6">
                                {/* Top: Custom Explorer (Horizontal) */}
                                <div>
                                    <CustomCombinationCard
                                        stats={aggregatedStats.all.custom}
                                        total={aggregatedStats.all.total}
                                        filters={customFilters}
                                        onFilterChange={setCustomFilters}
                                        onClick={() => setSelectedMetric({ demographic: null, category: 'Custom Selection', type: 'positive' })}
                                    />
                                </div>

                                {/* Bottom: High Level Stats Grid */}
                                <div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <StatOverviewCard
                                            title="Clubs Participation"
                                            value={`${aggregatedStats.all.clubs.pct}%`}
                                            subtitle={`${aggregatedStats.all.clubs.count} / ${aggregatedStats.all.total} students`}
                                            icon={Users} color="blue"
                                        />
                                        <StatOverviewCard
                                            title="Pupil Leadership"
                                            value={`${aggregatedStats.all.leadership.pct}%`}
                                            subtitle={`${aggregatedStats.all.leadership.count} / ${aggregatedStats.all.total} students`}
                                            icon={Award} color="purple"
                                        />
                                        <StatOverviewCard
                                            title="Trips & Visits"
                                            value={`${aggregatedStats.all.trips.pct}%`}
                                            subtitle={`${aggregatedStats.all.trips.count} / ${aggregatedStats.all.total} students`}
                                            icon={Tent} color="green"
                                        />
                                        <StatOverviewCard
                                            title="Sports Comp."
                                            value={`${aggregatedStats.all.sports.pct}%`}
                                            subtitle={`${aggregatedStats.all.sports.count} / ${aggregatedStats.all.total} students`}
                                            icon={Trophy} color="amber"
                                        />
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* Detailed Activity Breakdown (Always Visible) */}
                    {
                        currentBreakdown && (
                            <div className="space-y-4">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center justify-center gap-6 text-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-indigo-600 rounded-sm"></span>
                                        <span className="text-indigo-900 font-medium">Disadvantaged (PP)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 bg-gray-300 rounded-sm"></span>
                                        <span className="text-gray-600 font-medium">Non-PP</span>
                                    </div>
                                    <div className="flex items-center gap-2 pl-4 border-l border-indigo-200">
                                        <div className="h-4 w-0.5 bg-red-500 relative">
                                            <div className="absolute -top-1 -left-1 w-2.5 h-0.5 bg-red-500"></div>
                                            <div className="absolute -bottom-1 -left-1 w-2.5 h-0.5 bg-red-500"></div>
                                        </div>
                                        <span className="text-red-600 font-medium">Filtered Group Average ({ppBenchmark}%)</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <BreakdownCard
                                        title="Active Clubs"
                                        items={currentBreakdown.clubs}
                                        icon={Users}
                                        color="blue"
                                        benchmark={ppBenchmark}
                                        onItemClick={(item) => setSelectedMetric({
                                            category: 'Clubs',
                                            specificItem: item.name,
                                            type: 'positive',
                                            demographic: null
                                        })}
                                    />
                                    <BreakdownCard
                                        title="Leadership Roles"
                                        items={currentBreakdown.leadership}
                                        icon={Award}
                                        color="purple"
                                        benchmark={ppBenchmark}
                                        onItemClick={(item) => setSelectedMetric({
                                            category: 'Leadership',
                                            specificItem: item.name,
                                            type: 'positive',
                                            demographic: null
                                        })}
                                    />
                                    <BreakdownCard
                                        title="Trips & Visits"
                                        items={currentBreakdown.trips}
                                        icon={Tent}
                                        color="green"
                                        benchmark={ppBenchmark}
                                        onItemClick={(item) => setSelectedMetric({
                                            category: 'Trips',
                                            specificItem: item.name,
                                            type: 'positive',
                                            demographic: null
                                        })}
                                    />
                                    <BreakdownCard
                                        title="Sports Competitions"
                                        items={currentBreakdown.sports}
                                        icon={Trophy}
                                        color="amber"
                                        benchmark={ppBenchmark}
                                        onItemClick={(item) => setSelectedMetric({
                                            category: 'Sports',
                                            specificItem: item.name,
                                            type: 'positive',
                                            demographic: null
                                        })}
                                    />
                                </div>
                            </div>
                        )
                    }

                    {/* PP vs Non-PP Comparison */}
                    {aggregatedStats && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 border-b border-gray-200 flex items-center gap-2">
                                <BarChart className="w-5 h-5 text-gray-500" />
                                <h2 className="text-lg font-bold text-gray-900">Disadvantaged (PP) Comparison</h2>
                            </div>

                            <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-center text-sm text-blue-700">
                                <p>Click on any bar to see who is <strong>NOT</strong> participating (Inverse View).</p>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                <ComparisonChart
                                    category="Clubs"
                                    ppVal={aggregatedStats.pp.clubs.pct}
                                    nonPpVal={aggregatedStats.nonPp.clubs.pct}
                                    colorClass="bg-blue-500"
                                    bgClass="bg-blue-50"
                                    onBarClick={(demographic) => setSelectedMetric({ demographic, category: 'Clubs', type: 'inverse' })}
                                    selectedMetric={selectedMetric}
                                />
                                <ComparisonChart
                                    category="Leadership"
                                    ppVal={aggregatedStats.pp.leadership.pct}
                                    nonPpVal={aggregatedStats.nonPp.leadership.pct}
                                    colorClass="bg-purple-500"
                                    bgClass="bg-purple-50"
                                    onBarClick={(demographic) => setSelectedMetric({ demographic, category: 'Leadership', type: 'inverse' })}
                                    selectedMetric={selectedMetric}
                                />
                                <ComparisonChart
                                    category="Trips"
                                    ppVal={aggregatedStats.pp.trips.pct}
                                    nonPpVal={aggregatedStats.nonPp.trips.pct}
                                    colorClass="bg-green-500"
                                    bgClass="bg-green-50"
                                    onBarClick={(demographic) => setSelectedMetric({ demographic, category: 'Trips', type: 'inverse' })}
                                    selectedMetric={selectedMetric}
                                />
                                <ComparisonChart
                                    category="Sports"
                                    ppVal={aggregatedStats.pp.sports.pct}
                                    nonPpVal={aggregatedStats.nonPp.sports.pct}
                                    colorClass="bg-amber-500"
                                    bgClass="bg-amber-50"
                                    onBarClick={(demographic) => setSelectedMetric({ demographic, category: 'Sports', type: 'inverse' })}
                                    selectedMetric={selectedMetric}
                                />
                            </div>
                        </div>
                    )}

                    {/* Interaction Result: Drill Down List */}
                    {
                        selectedMetric && (
                            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2 rounded-lg", selectedMetric.type === 'positive' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                {selectedMetric.specificItem ? (
                                                    <span>{selectedMetric.specificItem}</span>
                                                ) : (
                                                    <span>
                                                        {selectedMetric.demographic === 'pp' ? 'Disadvantaged (PP)' : selectedMetric.demographic === 'nonPp' ? 'Non-PP' : 'All'} Students
                                                    </span>
                                                )}

                                                <span className={cn("text-sm px-2 py-0.5 rounded-full", selectedMetric.type === 'positive' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                    {selectedMetric.type === 'positive' ? 'Participating' : 'NOT Participating'}
                                                </span>

                                                {!selectedMetric.specificItem && (
                                                    <span className="text-gray-500 text-sm font-normal">in {selectedMetric.category}</span>
                                                )}
                                            </h3>
                                            <p className="text-sm text-gray-500">{sortedList.length} students found</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Toggle Button for Inverse/Positive - Only if not specific item */}
                                        {!selectedMetric.specificItem && (
                                            <button
                                                onClick={() => setSelectedMetric(prev => ({ ...prev, type: prev.type === 'positive' ? 'inverse' : 'positive' }))}
                                                className="text-xs font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                                Switch to {selectedMetric.type === 'positive' ? 'Who is Missing' : 'Who is Participating'}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setSelectedMetric(null)}
                                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full"
                                        >
                                            <span className="sr-only">Close</span>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-[500px] overflow-y-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0 cursor-pointer select-none">
                                            <tr>
                                                <th
                                                    onClick={() => handleSort('name')}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Name
                                                        <SortIcon column="name" />
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSort('yearGroup')}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Year
                                                        <SortIcon column="yearGroup" />
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSort('registrationForm')}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        Class
                                                        <SortIcon column="registrationForm" />
                                                    </div>
                                                </th>
                                                <th
                                                    onClick={() => handleSort('pupilPremium')}
                                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-gray-100 transition-colors"
                                                >
                                                    <div className="flex items-center gap-1">
                                                        PP
                                                        <SortIcon column="pupilPremium" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sortedList.map((student, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {student['forename'] || student['firstName'] || student['name'] || student['studentName'] || 'Unknown'} {student['surname'] || student['lastName'] || ''}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.yearGroup}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.registrationForm}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {student.pupilPremium === 'Yes' ? (
                                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">PP</span>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {sortedList.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                                                        No students found matching this criteria.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    }
                </>
            )}
        </div>
    );
}

function BreakdownCard({ title, items, icon: Icon, color, benchmark, onItemClick }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-l-4 border-blue-500",
        purple: "bg-purple-50 text-purple-600 border-l-4 border-purple-500",
        green: "bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500",
        amber: "bg-amber-50 text-amber-600 border-l-4 border-amber-500",
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
            <div className={cn("flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100", colors[color])}>
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    <h3 className="font-bold">{title}</h3>
                </div>
            </div>
            {/* Content Container */}
            <div className="p-0 overflow-y-auto max-h-[400px] divide-y divide-gray-100">
                {items.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 italic text-sm">No activities found</div>
                ) : (
                    items.map((item, idx) => (
                        <div
                            key={idx}
                            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                            onClick={() => onItemClick && onItemClick(item)}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={cn("font-medium text-sm transition-colors group-hover:text-indigo-600", "text-gray-700")}>{item.name}</span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{item.total}</span>
                            </div>

                            {/* Stacked Bar Container - Needs relative for the line to position correctly */}
                            <div className="relative mt-2">
                                {/* The Bar */}
                                <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                                    {/* PP Segment */}
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-indigo-600 transition-all duration-500"
                                        style={{ width: `${item.ppPct}%` }}
                                        title={`PP: ${item.pp} (${item.ppPct}%)`}
                                    />
                                </div>

                                {/* Benchmark Line (Overlay) */}
                                <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                                    style={{
                                        left: `${benchmark}%`,
                                        height: '150%', // Make it slightly taller
                                        top: '-25%'    // Center it vertically
                                    }}
                                />
                            </div>

                            <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                                <span>PP: {item.pp} ({item.ppPct}%)</span>
                                <span>Non-PP: {item.nonPp} ({item.nonPpPct}%)</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div >
    );
}

function StatOverviewCard({ title, value, subtitle, icon: Icon, color, onClick, className }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        purple: "bg-purple-50 text-purple-600",
        green: "bg-emerald-50 text-emerald-600",
        amber: "bg-amber-50 text-amber-600",
        rose: "bg-rose-50 text-rose-600",
    };
    return (
        <div
            onClick={onClick}
            className={cn("bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex items-center gap-4", className)}
        >
            <div className={cn("p-4 rounded-xl", colors[color])}>
                <Icon className="w-8 h-8" />
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
                <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
        </div>
    )
}

function CustomCombinationCard({ stats, total, onClick, filters, onFilterChange }) {
    const handleCheck = (key) => {
        onFilterChange({ ...filters, [key]: !filters[key] });
    };

    const toggleLogic = () => {
        onFilterChange({ ...filters, logic: filters.logic === 'AND' ? 'OR' : 'AND' });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Left: Title and Logic Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-fit">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Sliders className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight">Custom Explorer</h3>
                            <p className="text-xs text-gray-400">Build your own group</p>
                        </div>
                    </div>

                    <button
                        onClick={toggleLogic}
                        className={cn("px-3 py-1 text-xs font-bold rounded-full uppercase transition-colors tracking-wide border w-fit",
                            filters.logic === 'AND'
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        )}
                        title="Toggle Logic"
                    >
                        {filters.logic} Mode
                    </button>
                </div>

                {/* Center: Filters */}
                <div className="flex-1 border-y lg:border-y-0 lg:border-x border-gray-100 py-4 lg:py-0 lg:px-6">
                    <div className="flex flex-wrap gap-2 lg:gap-4 justify-start lg:justify-center">
                        {[
                            { key: 'clubs', label: 'Clubs' },
                            { key: 'leadership', label: 'Leadership' },
                            { key: 'trips', label: 'Trips' },
                            { key: 'sports', label: 'Sports' }
                        ].map(opt => (
                            <label
                                key={opt.key}
                                onClick={() => handleCheck(opt.key)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border text-sm font-medium select-none",
                                    filters[opt.key]
                                        ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                        : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                                )}>
                                <div className={cn(
                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                    filters[opt.key] ? "bg-indigo-600 border-indigo-600" : "border-gray-300 bg-white"
                                )}>
                                    {filters[opt.key] && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span>{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Right: Stats and Action */}
                <div className="flex items-center gap-6 min-w-fit justify-end">
                    <div className="text-right">
                        <div className="flex items-baseline justify-end gap-1.5">
                            <span className="text-2xl font-extrabold text-gray-900">{stats.pct}%</span>
                            <span className="text-xs font-medium text-gray-500">participating</span>
                        </div>
                        <p className="text-xs text-gray-400">{stats.count} / {total} students</p>
                    </div>

                    <div className="h-10 w-px bg-gray-200 hidden sm:block"></div>

                    <button
                        onClick={onClick}
                        className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-all shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                    >
                        View List
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>
        </div>
    )
}

function ComparisonChart({ category, ppVal, nonPpVal, colorClass, bgClass, onBarClick, selectedMetric }) {

    const isSelected = (demo) => selectedMetric?.category === category && selectedMetric?.demographic === demo;

    return (
        <div className="flex flex-col gap-4">
            <h3 className="font-semibold text-gray-700 text-center">{category} Participation</h3>

            <div className="space-y-4">
                {/* PP Bar */}
                <div
                    onClick={() => onBarClick('pp')}
                    className={cn(
                        "group cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 border border-transparent hover:border-gray-200",
                        isSelected('pp') ? "ring-2 ring-indigo-500 bg-indigo-50" : ""
                    )}
                >
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-600 group-hover:text-gray-900">Disadvantaged (PP)</span>
                        <span className="font-bold text-gray-900">{ppVal}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", colorClass)}
                            style={{ width: `${ppVal}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-gray-400 group-hover:text-indigo-600 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to see who is missing
                    </div>
                </div>

                {/* Non-PP Bar */}
                <div
                    onClick={() => onBarClick('nonPp')}
                    className={cn(
                        "group cursor-pointer rounded-lg p-2 transition-all hover:bg-gray-50 border border-transparent hover:border-gray-200",
                        isSelected('nonPp') ? "ring-2 ring-indigo-500 bg-indigo-50" : ""
                    )}
                >
                    <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-600 group-hover:text-gray-900">Non-PP</span>
                        <span className="font-bold text-gray-900">{nonPpVal}%</span>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500 opacity-60", colorClass)}
                            style={{ width: `${nonPpVal}%` }}
                        />
                    </div>
                    <div className="mt-1 text-xs text-gray-400 group-hover:text-indigo-600 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        Click to see who is missing
                    </div>
                </div>
            </div>
        </div>
    )
}
