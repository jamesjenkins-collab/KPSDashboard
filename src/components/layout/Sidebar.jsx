import { useState } from 'react';
import { Filter, ChevronDown, ChevronRight, X, LayoutDashboard, BookOpen, Baby, Globe, TrendingUp, Home, School as SchoolIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import logo from '../../assets/logo.png';

export function Sidebar({
    className,
    filters = {},
    onFilterChange = () => { },
    availableFilters = { yearGroups: [], registrationForms: {}, subjects: [], terms: [], sex: [] },
    currentView = 'dashboard',
    onNavigate = () => { }
}) {
    const [expandedSections, setExpandedSections] = useState({
        school: true,
        achievement: true,
        attendance: false,
        curriculum: false,
        leadership: false,
        inclusion: false,
        personalDevelopment: true,

        // Filter sections
        yearGroup: false, // Collapsed by default to save space
        subject: false,
        term: false,
        demographics: false,
        wellbeing: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const handleFilterToggle = (category, value) => {
        const currentValues = filters[category] || [];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];

        onFilterChange(category, newValues);
    };

    // Special handler for Year Group / Registration Form nested logic
    const handleYearGroupToggle = (year, specificChild = null) => {
        const currentYears = filters.yearGroup || [];
        const currentForms = filters.registrationForm || [];
        const yearChildren = availableFilters.registrationForms[year] || [];

        // CASE 1: Toggling the Parent (Year Group)
        if (!specificChild) {
            const isYearSelected = currentYears.includes(year);

            if (isYearSelected) {
                // Deselect Year: Remove from yearGroup, remove all children from registrationForm
                onFilterChange('yearGroup', currentYears.filter(y => y !== year));
                onFilterChange('registrationForm', currentForms.filter(f => !yearChildren.includes(f)));
            } else {
                // Select Year: Add to yearGroup, remove children from registrationForm (implicit all)
                onFilterChange('yearGroup', [...currentYears, year]);
                // Ensure no children from this year are in specific filter list (clean state)
                onFilterChange('registrationForm', currentForms.filter(f => !yearChildren.includes(f)));
            }
            return;
        }

        // CASE 2: Toggling a Child (Registration Form)
        const isChildSelected = currentForms.includes(specificChild) || currentYears.includes(year);

        if (currentYears.includes(year)) {
            // Year was fully selected, now user is deselecting one child
            // Action: Remove year from yearGroup, add ALL OTHER children to registrationForm
            const otherChildren = yearChildren.filter(c => c !== specificChild);
            onFilterChange('yearGroup', currentYears.filter(y => y !== year));
            onFilterChange('registrationForm', [...currentForms, ...otherChildren]);
        } else {
            // Year was NOT fully selected (mixed state)
            const isSpecifcChildSelected = currentForms.includes(specificChild);

            if (isSpecifcChildSelected) {
                // Deselecting this child
                const newForms = currentForms.filter(f => f !== specificChild);
                onFilterChange('registrationForm', newForms);
            } else {
                // Selecting this child
                const newForms = [...currentForms, specificChild];

                // Check if ALL children are now selected
                const allChildrenSelected = yearChildren.every(c => newForms.includes(c));

                if (allChildrenSelected) {
                    // Promotion! All children selected -> select Year, clear children
                    onFilterChange('yearGroup', [...currentYears, year]);
                    onFilterChange('registrationForm', newForms.filter(f => !yearChildren.includes(f)));
                } else {
                    // Just add the child
                    onFilterChange('registrationForm', newForms);
                }
            }
        }
    };

    const clearAllFilters = () => {
        Object.keys(filters).forEach(category => {
            onFilterChange(category, []);
        });
    };

    const hasActiveFilters = Object.values(filters).some(f => f.length > 0);

    return (
        <div className={cn("w-64 bg-white border-r border-gray-200 h-screen flex flex-col overflow-hidden", className)}>
            {/* Logo Area */}
            <div className="p-6 border-b border-gray-100 flex justify-center">
                <img src={logo} alt="Kensington Primary School" className="h-16 w-auto object-contain" />
            </div>

            {/* Filters Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                    <Filter className="w-5 h-5" />
                    Filters
                </h2>
                {hasActiveFilters && (
                    <button
                        onClick={clearAllFilters}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                        Clear All
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2">
                {/* Term Filter */}
                <CollapsibleSection
                    title="Term"
                    isExpanded={expandedSections.term}
                    onToggle={() => toggleSection('term')}
                    activeCount={filters.term?.length || 0}
                >
                    <FilterSection
                        options={availableFilters.terms}
                        selected={filters.term || []}
                        onToggle={(value) => handleFilterToggle('term', value)}
                    />
                </CollapsibleSection>

                {/* Subject Filter */}
                <CollapsibleSection
                    title="Subject"
                    isExpanded={expandedSections.subject}
                    onToggle={() => toggleSection('subject')}
                    activeCount={filters.subject?.length || 0}
                >
                    <FilterSection
                        options={availableFilters.subjects}
                        selected={filters.subject || []}
                        onToggle={(value) => handleFilterToggle('subject', value)}
                    />
                </CollapsibleSection>

                {/* Year Group Filter */}
                <CollapsibleSection
                    title="Year Group"
                    isExpanded={expandedSections.yearGroup}
                    onToggle={() => toggleSection('yearGroup')}
                    activeCount={
                        (filters.yearGroup?.length || 0) +
                        (filters.registrationForm?.length || 0)
                    }
                >
                    <NestedFilterSection
                        options={availableFilters.yearGroups}
                        childMap={availableFilters.registrationForms}
                        selectedParents={filters.yearGroup || []}
                        selectedChildren={filters.registrationForm || []}
                        onToggle={(parent, child) => handleYearGroupToggle(parent, child)}
                    />
                </CollapsibleSection>

                {/* Demographics */}
                <CollapsibleSection
                    title="Demographics"
                    isExpanded={expandedSections.demographics}
                    onToggle={() => toggleSection('demographics')}
                    activeCount={
                        (filters.pupilPremium?.length || 0) +
                        (filters.sen?.length || 0) +
                        (filters.eal?.length || 0) +
                        (filters.sex?.length || 0)
                    }
                >
                    <div className="space-y-4">
                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Pupil Premium</h5>
                            <FilterSection
                                options={['Yes', 'No']}
                                selected={filters.pupilPremium || []}
                                onToggle={(value) => handleFilterToggle('pupilPremium', value)}
                            />
                        </div>

                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">SEN</h5>
                            <FilterSection
                                options={['Yes', 'No']}
                                selected={filters.sen || []}
                                onToggle={(value) => handleFilterToggle('sen', value)}
                            />
                        </div>

                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">EAL</h5>
                            <FilterSection
                                options={['Yes', 'No']}
                                selected={filters.eal || []}
                                onToggle={(value) => handleFilterToggle('eal', value)}
                            />
                        </div>

                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Summer Born</h5>
                            <FilterSection
                                options={['Yes', 'No']}
                                selected={filters.summerBorn || []}
                                onToggle={(value) => handleFilterToggle('summerBorn', value)}
                            />
                        </div>

                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">In Year Admission</h5>
                            <FilterSection
                                options={['Yes', 'No']}
                                selected={filters.inYearAdmission || []}
                                onToggle={(value) => handleFilterToggle('inYearAdmission', value)}
                            />
                        </div>

                        <div>
                            <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Sex</h5>
                            <FilterSection
                                options={availableFilters.sex}
                                selected={filters.sex || []}
                                onToggle={(value) => handleFilterToggle('sex', value)}
                            />
                        </div>
                    </div>
                </CollapsibleSection>

                {/* Wellbeing Filter */}
                <CollapsibleSection
                    title="Wellbeing Score"
                    isExpanded={expandedSections.wellbeing}
                    onToggle={() => toggleSection('wellbeing')}
                    activeCount={filters.wellbeing?.length || 0}
                >
                    <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-medium mb-2 uppercase tracking-tight">Average Score (1-5)</p>
                        <FilterSection
                            options={availableFilters.wellbeing}
                            selected={filters.wellbeing || []}
                            onToggle={(value) => handleFilterToggle('wellbeing', value)}
                        />
                    </div>
                </CollapsibleSection>
            </div>
        </div>
    );
}

function CollapsibleSection({ title, isExpanded, onToggle, activeCount, children }) {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-sm">{title}</span>
                    {activeCount > 0 && (
                        <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                            {activeCount}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
            </button>
            {isExpanded && (
                <div className="p-3 pt-0 border-t border-gray-100">
                    {children}
                </div>
            )}
        </div>
    );
}

function NestedFilterSection({ options, childMap, selectedParents, selectedChildren, onToggle }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="space-y-1">
            {options.map(option => {
                const children = childMap[option] || [];
                const isParentSelected = selectedParents.includes(option);
                // Parent is indeterminate if not selected but some children are
                // But for standard checkbox UI, we usually just show it unchecked or checked.
                // Let's stick to standard behavior: Checked if fully selected.

                return (
                    <div key={option}>
                        <label className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isParentSelected}
                                onChange={() => onToggle(option, null)}
                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-medium text-gray-800">{option}</span>
                        </label>

                        {/* Nested Children */}
                        {children.length > 0 && (
                            <div className="ml-6 space-y-1 mt-1 border-l-2 border-gray-100 pl-2">
                                {children.map(child => {
                                    const isChildSelected = isParentSelected || selectedChildren.includes(child);

                                    return (
                                        <label
                                            key={child}
                                            className="flex items-center gap-2 py-0.5 px-2 rounded hover:bg-gray-50 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChildSelected}
                                                onChange={() => onToggle(option, child)}
                                                className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-xs text-gray-600">{child}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function FilterSection({ options, selected, onToggle }) {
    if (!options || options.length === 0) return null;

    return (
        <div className="space-y-1">
            {options.map(option => (
                <label
                    key={option}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer"
                >
                    <input
                        type="checkbox"
                        checked={selected.includes(option)}
                        onChange={() => onToggle(option)}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                </label>
            ))}
        </div>
    );
}
