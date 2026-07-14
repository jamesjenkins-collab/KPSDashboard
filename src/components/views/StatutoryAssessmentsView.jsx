import React, { useState, useMemo, useEffect } from 'react';
import {
    TrendingUp, Users, BarChart3, FileWarning, Database, FileSpreadsheet, Search
} from 'lucide-react';
import { cn } from '../../lib/utils';
import idsrData from '../../data/idsr_benchmarks.json';

export function StatutoryAssessmentsView({ persistedData = [], mainData = [], leaversData = [], includeLeavers = false, onSave, accessToken, sheetTabName = '25/26' }) {
    const [activeSection, setActiveSection] = useState('analysis'); // 'analysis', 'progress', 'benchmarks'
    const [activePhase, setActivePhase] = useState('KS2'); // 'KS2', 'KS1', 'MTC', 'Phonics', 'EYFS'

    // Tab list states for diagnostics
    const [kensingtonTabs, setKensingtonTabs] = useState([]);
    const [statutoryTabs, setStatutoryTabs] = useState([]);

    useEffect(() => {
        if (!accessToken) return;
        const KENSINGTON_ASSESSMENT_SPREADSHEET_ID = '1q5lITtOhorRbtDlQwLavS5Wl60n1mUmvsEYLpLPm6Jc';
        const STATUTORY_SPREADSHEET_ID = '1vvhM4MOO3Mn5ASrRKOM6F5lp_sLm9uWXmux-FABJvm4';

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${KENSINGTON_ASSESSMENT_SPREADSHEET_ID}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
            .then(res => res.json())
            .then(meta => {
                setKensingtonTabs(meta.sheets?.map(s => s.properties?.title) || []);
            })
            .catch(e => console.error("Diagnostics: Failed to fetch Kensington tabs", e));

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${STATUTORY_SPREADSHEET_ID}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        })
            .then(res => res.json())
            .then(meta => {
                setStatutoryTabs(meta.sheets?.map(s => s.properties?.title) || []);
            })
            .catch(e => console.error("Diagnostics: Failed to fetch Statutory tabs", e));
    }, [accessToken]);
    
    // Filters
    const [yearFilter, setYearFilter] = useState('2025/26');
    const [showDisapplied, setShowDisapplied] = useState(false);
    const [pupilSearch, setPupilSearch] = useState('');
    const [drillDownGroup, setDrillDownGroup] = useState(null); // { title: string, students: [] }

    // Helper to normalize UPN for matching
    const normalizeUPN = (upn) => String(upn || '').toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

    // Helper to normalize names for fallback matching
    const getCanonicalName = (name) => {
        if (!name) return '';
        return String(name).toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(Boolean)
            .sort()
            .join('');
    };

    const handleToggleDisapply = async (upn, subject) => {
        const normUpn = normalizeUPN(upn);
        try {
            const studentMap = new Map();
            persistedData.forEach(row => {
                const key = normalizeUPN(row.upn);
                if (!studentMap.has(key)) {
                    studentMap.set(key, { upn: row.upn, name: row.name, assessments: [] });
                }
                
                const isTarget = normalizeUPN(row.upn) === normUpn && 
                                (row.subject === subject || row.subject?.toLowerCase().includes(subject.toLowerCase()));
                
                const currentStatus = row.disapplied === 'Yes' || row.Disapplied === 'Yes';
                const newStatus = isTarget ? !currentStatus : currentStatus;

                studentMap.get(key).assessments.push({
                    stage: row.stage,
                    subject: row.subject,
                    result: row.result,
                    mark: row.mark,
                    date: row.date,
                    rawSubject: row.rawSubject,
                    component: row.component,
                    specialConsideration: row.specialConsideration || row.SpecialConsideration || 'No',
                    disapplied: newStatus ? 'Yes' : 'No'
                });
            });

            await onSave(Array.from(studentMap.values()));
        } catch (err) {
            console.error("Failed to toggle disapply:", err);
            alert("Failed to update student status.");
        }
    };

    // Year group matching helper functions
    const isReception = (yg) => {
        const val = String(yg || '').toLowerCase().trim();
        return val.includes('reception') || val === 'r' || val === 'year r' || val === '0';
    };
    const isYear1 = (yg) => {
        const val = String(yg || '').toLowerCase().trim();
        return val === 'year 1' || val === '1';
    };
    const isYear2 = (yg) => {
        const val = String(yg || '').toLowerCase().trim();
        return val === 'year 2' || val === '2';
    };
    const isYear4 = (yg) => {
        const val = String(yg || '').toLowerCase().trim();
        return val === 'year 4' || val === '4';
    };
    const isYear6 = (yg) => {
        const val = String(yg || '').toLowerCase().trim();
        return val === 'year 6' || val === '6';
    };

    const CURRENT_ACADEMIC_YEAR_LABEL = '25/26';
    const stagesSatThisYearFor = (yearGroup) => {
        if (isYear6(yearGroup)) return ['KS2', '2'];
        if (isYear4(yearGroup)) return ['4', 'MTC'];
        if (isYear2(yearGroup)) return ['KS1', '1', '2'];
        if (isYear1(yearGroup)) return ['1'];
        if (isReception(yearGroup)) return ['EYFS', 'EYF'];
        return [];
    };

    // Map main demographics and deduplicate results (keep latest)
    const enrichedData = useMemo(() => {
        if (!persistedData) return [];
        
        const demoMap = new Map();
        const demoNameMap = new Map();
        
        mainData.forEach(student => {
            const keys = Object.keys(student);
            const upnKey = keys.find(k => k.toLowerCase() === 'upn') || keys.find(k => k.toLowerCase().includes('upn'));
            const upn = upnKey ? normalizeUPN(student[upnKey]) : null;
            if (upn) demoMap.set(upn, student);
            
            const cName = getCanonicalName(student.name);
            if (cName) demoNameMap.set(cName, student);
        });

        // Sorted name tokens for fuzzy fallback matching (tolerates a middle name
        // that only one source carries, e.g. "Abdullah, Faraaz" vs "Faraaz M Abdullah")
        const getNameTokens = (name) => String(name || '').toLowerCase()
            .replace(/[^a-z0-9\s]/g, ' ')
            .split(/\s+/)
            .filter(Boolean)
            .sort();
        const demoTokenList = [];
        demoNameMap.forEach(student => {
            const tokens = getNameTokens(student.name);
            if (tokens.length >= 2) demoTokenList.push({ student, tokens });
        });
        const unmatchedPupils = new Set();

        const leaversSet = new Set(
            (leaversData || []).map(l => {
                const upn = l.upn || l.UPN || l.pupilUpn || l.pupilUPN || '';
                return String(upn).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
            }).filter(Boolean)
        );

        // Filter and map persisted results
        const allRows = persistedData.filter(row => {
            const upn = normalizeUPN(row.upn);
            if (!includeLeavers && leaversSet.has(upn)) return false;
            
            // Check result validity
            const resultUpper = String(row.result || '').toUpperCase().trim();
            if (resultUpper === 'L') return false;

            const isMTC = row.subject?.toLowerCase().includes('multiplication') || 
                          row.rawSubject?.toLowerCase().includes('mtc') ||
                          row.component?.toLowerCase().includes('mtc');
            if (isMTC && (resultUpper === 'B' || isNaN(parseInt(resultUpper)))) return false;

            return true;
        }).map(row => {
            const normUpn = normalizeUPN(row.upn);
            let studentDemo = normUpn ? demoMap.get(normUpn) : null;
            
            // Fallback: If UPN fails (e.g. EYFS sheet lacks UPN col and parses name as UPN)
            if (!studentDemo && row.name) {
                studentDemo = demoNameMap.get(getCanonicalName(row.name));
            }

            // Fallback 2: unique token-subset match, so a middle name in only one
            // source doesn't break the join
            if (!studentDemo && row.name) {
                const rowTokens = getNameTokens(row.name);
                if (rowTokens.length >= 2) {
                    const matches = demoTokenList.filter(({ tokens }) => {
                        const [small, big] = rowTokens.length <= tokens.length ? [rowTokens, tokens] : [tokens, rowTokens];
                        return small.every(t => big.includes(t));
                    });
                    if (matches.length === 1) studentDemo = matches[0].student;
                }
            }

            if (!studentDemo) {
                unmatchedPupils.add(`${row.name || '(no name)'} [${row.upn || 'no UPN'}]`);
            }

            const isKS2 = row.stage === '2' || row.stage === 'KS2' || isYear6(studentDemo?.yearGroup);
            const hasSpecCon = isKS2 && (row.specialConsideration === 'Yes' || row.SpecialConsideration === 'Yes' || row.SpecialConsideration === '1');
            const isDisapplied = row.disapplied === 'Yes' || row.Disapplied === 'Yes';

            const rawMark = row.scaledScore || row.ScaledScore || row.mark || row.score || row.Mark || "";
            let markVal = parseInt(String(rawMark).replace(/[^0-9]/g, '')) || parseInt(String(row.result).replace(/[^0-9]/g, ''));
            
            // Special Consideration Logic (+3 scaled score points for KS2)
            if (hasSpecCon && !isNaN(markVal)) {
                markVal += 3;
            }

            const isPhonics = row.subject?.toLowerCase().includes('phonics') || row.rawSubject?.toLowerCase().includes('pho');
            const isEYFS = row.stage === 'EYFS' || row.stage === 'EYF';
            const isMTC = row.subject?.toLowerCase().includes('multiplication') || row.rawSubject?.toLowerCase().includes('mtc');
            
            let isEXS = false;
            let isGDS = false;
            let isPass = false;

            if (isPhonics) {
                isPass = markVal >= 32 || String(row.result).toUpperCase() === 'WA';
                isEXS = isPass;
            } else if (isEYFS) {
                isPass = row.result === '2' || String(row.result).toLowerCase().includes('exp');
                isEXS = isPass;
            } else if (isMTC) {
                isPass = markVal === 25;
                isEXS = isPass;
            } else {
                const resultUpper = String(row.result || "").toUpperCase();
                isGDS = resultUpper === 'GDS' || (markVal >= 110 && !isNaN(markVal));
                isEXS = resultUpper === 'EXS' || resultUpper === 'AS' || isGDS || (markVal >= 100 && !isNaN(markVal));
                isPass = isEXS;
            }

            let academicYear = 'Unknown';
            const yearSource = row.date || row.academicYear || sheetTabName;
            if (yearSource) {
                const dateStr = String(yearSource).trim();
                const spanMatch = dateStr.match(/\d{4}\/\d{2}/) || dateStr.match(/\d{2}\/\d{2}/);
                const yearMatch = dateStr.match(/\d{4}/);
                
                if (spanMatch) {
                    academicYear = spanMatch[0].length === 5 ? `20${spanMatch[0]}` : spanMatch[0];
                } else if (yearMatch) {
                    academicYear = yearMatch[0];
                }
            }

            // Fallback to current Year Group cohort logic
            if (!academicYear || academicYear === 'Unknown') {
                if (studentDemo?.yearGroup) {
                    const yg = String(studentDemo.yearGroup).toLowerCase().trim();
                    const isPhonicsY2 = isPhonics && (row.stage === '2' || row.subject?.includes('Y2') || row.subject?.includes('resit'));
                    
                    if (isReception(yg)) {
                        if (isEYFS) academicYear = '2025/26';
                    } else if (isYear1(yg)) {
                        if (isPhonics && !isPhonicsY2) academicYear = '2025/26';
                        else if (isEYFS) academicYear = '2024/25';
                    } else if (isYear2(yg)) {
                        if (row.stage === 'KS1' || isPhonicsY2) academicYear = '2025/26';
                        else if (isPhonics && !isPhonicsY2) academicYear = '2024/25';
                        else if (isEYFS) academicYear = '2023/24';
                    } else if (isYear4(yg)) {
                        if (isMTC) academicYear = '2025/26';
                    } else if (isYear6(yg)) {
                        if (row.stage === 'KS2') academicYear = '2025/26';
                        else if (isMTC) academicYear = '2023/24';
                    }
                }
                // No fallback for students missing from demographics: they are off-roll
                // (historic leavers), so without a date we can't place them in a cohort
            }

            let inferredYearGroup = studentDemo?.yearGroup;
            if (!inferredYearGroup || inferredYearGroup === 'Unknown') {
                if (isEYFS) inferredYearGroup = 'Reception';
                else if (row.stage === 'KS1') inferredYearGroup = 'Year 2';
                else if (row.stage === 'KS2') inferredYearGroup = 'Year 6';
                else if (isMTC) inferredYearGroup = 'Year 4';
                else if (isPhonics) {
                    inferredYearGroup = (row.stage === '2' || row.subject?.includes('Y2') || row.subject?.includes('resit')) ? 'Year 2' : 'Year 1';
                } else {
                    inferredYearGroup = 'Unknown';
                }
            }

            const rowStage = String(row.stage || '').trim();
            const isCurrentAcademicYear = (!!studentDemo?.yearGroup &&
                stagesSatThisYearFor(studentDemo.yearGroup).includes(rowStage)) ||
                (academicYear === '2025/26' || academicYear === '25/26');

            return {
                ...row,
                name: studentDemo?.name || row.name || ('Student ' + row.upn),
                academicYear,
                isCurrentAcademicYear,
                hasDemographics: !!studentDemo,
                sex: studentDemo?.sex || 'Unknown',
                pupilPremium: studentDemo?.pupilPremium || 'No',
                sen: studentDemo?.sEN || studentDemo?.sen || 'No',
                eal: studentDemo?.eAL || studentDemo?.eal || 'No',
                summerBorn: studentDemo?.summerBorn || 'No',
                inYearAdmission: studentDemo?.inYearAdmission || 'No',
                yearGroup: inferredYearGroup,
                isEXS,
                isGDS,
                isPass,
                markValue: isNaN(markVal) ? null : markVal,
                displayResult: isGDS ? 'GDS' : (isPhonics ? (`${isEXS ? 'WA' : 'Wt'}${!isNaN(markVal) && markVal !== null ? ` (${markVal})` : ''}`) : (isEXS ? 'EXS' : (isEYFS ? (row.result === '2' ? 'Expected' : 'Emerging') : row.result))),
                isPhonics,
                isMTC,
                isEYFS,
                disapplied: isDisapplied
            };
        });

        // Pupils with no demographics match are not on the current roll (historic
        // leavers with old statutory results) — hide them unless Include Leavers is on
        const rosterRows = includeLeavers ? allRows : allRows.filter(r => r.hasDemographics || r.isEYFS);
        if (unmatchedPupils.size > 0) {
            console.warn(`[Statutory] ${unmatchedPupils.size} pupil(s) have no demographics match and are treated as leavers${includeLeavers ? '' : ' (hidden — enable Include Leavers to show them)'}:`, Array.from(unmatchedPupils));
        }

        // Deduplicate
        const latestMap = new Map();
        rosterRows.forEach(row => {
            const cleanSub = String(row.subject || row.rawSubject || '').toLowerCase().trim();
            const baseSubject = row.isPhonics ? 'phonics' : cleanSub;
            const key = `${normalizeUPN(row.upn)}-${baseSubject}`;
            const existing = latestMap.get(key);
            
            if (!existing || parseInt(row.academicYear) >= parseInt(existing.academicYear)) {
                latestMap.set(key, row);
            }
        });

        return Array.from(latestMap.values());
    }, [persistedData, mainData, leaversData, includeLeavers]);

    const availableYears = useMemo(() => ['All', ...new Set(enrichedData.map(d => d.academicYear))].sort().reverse(), [enrichedData]);

    // Active Selected Subject Definition for Deep Dive
    const [selectedSubject, setSelectedSubject] = useState({
        title: 'RWM Combined',
        stageMatches: ['2', 'KS2'],
        subjectQueries: ['reading', 'writing', 'maths'],
        isCombined: true,
        yearGroupCheck: isYear6
    });

    // Reset selected subject when activePhase changes
    useEffect(() => {
        if (activePhase === 'KS2') {
            setSelectedSubject({
                title: 'RWM Combined',
                stageMatches: ['2', 'KS2'],
                subjectQueries: ['reading', 'writing', 'maths'],
                isCombined: true,
                yearGroupCheck: isYear6
            });
        } else if (activePhase === 'KS1') {
            setSelectedSubject({
                title: 'Reading',
                stageMatches: ['1', 'KS1'],
                subjectQueries: ['reading', 'rdg'],
                yearGroupCheck: isYear2
            });
        } else if (activePhase === 'MTC') {
            setSelectedSubject({
                title: 'Multiplication Check',
                stageMatches: ['MTC', '4'],
                subjectQueries: ['multiplication', 'mtc'],
                yearGroupCheck: isYear4
            });
        } else if (activePhase === 'Phonics') {
            setSelectedSubject({
                title: 'Phonics (Y1)',
                stageMatches: ['PHO', '1'],
                subjectQueries: ['phonics', 'pho'],
                customFilter: (d) => !d.subject?.includes('Y2'),
                yearGroupCheck: isYear1
            });
        } else if (activePhase === 'EYFS') {
            setSelectedSubject({
                title: 'Good Level of Development (GLD)',
                stageMatches: ['EYFS', 'EYF'],
                subjectQueries: ['gld', 'good level of development'],
                isCombined: true,
                yearGroupCheck: isReception
            });
        }
    }, [activePhase]);

    // Filtered data for the active academic year
    const filteredYearData = useMemo(() => {
        return enrichedData.filter(d => yearFilter === 'All' || d.academicYear === yearFilter);
    }, [enrichedData, yearFilter]);

    // Dynamic GLD Standard Checker for Reception Phase (checks expected standard in 12 specific ELGs)
    const checkStudentGld = (assessments) => {
        const metGoals = new Set();
        assessments.forEach(a => {
            if (!a.isEXS) return;

            const sub = String(a.subject || '').toLowerCase().trim();
            
            // Prime Areas: COM (2), PHY (2), PSED (3)
            if (sub.includes('com-e01') || sub.includes('listening, attention')) metGoals.add('COM1');
            if (sub.includes('com-e02') || sub.includes('speaking')) metGoals.add('COM2');
            if (sub.includes('phy-e06') || sub.includes('gross motor')) metGoals.add('PHY1');
            if (sub.includes('phy-e07') || sub.includes('fine motor')) metGoals.add('PHY2');
            if (sub.includes('pse-e03') || sub.includes('self-regulation') || sub.includes('self regulation')) metGoals.add('PSE1');
            if (sub.includes('pse-e04') || sub.includes('managing self')) metGoals.add('PSE2');
            if (sub.includes('pse-e05') || sub.includes('building relationships')) metGoals.add('PSE3');

            // Specific Areas: LIT (3), MAT (2)
            if (sub.includes('lit-e08') || sub.includes('comprehension')) metGoals.add('LIT1');
            if (sub.includes('lit-e09') || sub.includes('word reading')) metGoals.add('LIT2');
            if (sub.includes('lit-e10') || sub.includes('writing')) metGoals.add('LIT3');
            if (sub.includes('mat-e11') || sub.includes('number')) metGoals.add('MAT1');
            if (sub.includes('mat-e12') || sub.includes('numerical patterns')) metGoals.add('MAT2');
        });

        return metGoals.size === 12;
    };

    // Dynamic Phase Stats Builder Helper
    const getStageSubjectStats = (stageMatches, subjectQueries, isCombined = false, recordFilter = null, targetYearGroupCheck = null, attainmentFilter = null) => {
        let stageData = filteredYearData.filter(d => 
            stageMatches.includes(String(d.stage).toUpperCase().trim()) && 
            !d.disapplied
        );

        if (targetYearGroupCheck && (yearFilter === '2025/26' || yearFilter === '25/26')) {
            stageData = stageData.filter(d => targetYearGroupCheck(d.yearGroup));
        }

        let subData = stageData;
        
        if (isCombined) {
            const studentMap = new Map();
            stageData.forEach(d => {
                if (!d.upn) return;
                const key = normalizeUPN(d.upn);
                if (!studentMap.has(key)) {
                    studentMap.set(key, { 
                        assessments: [], 
                        r: false, w: false, m: false, 
                        rGds: false, wGds: false, mGds: false 
                    });
                }
                const s = studentMap.get(key);
                s.assessments.push(d);
                const subLower = String(d.subject || '').toLowerCase();
                if (subLower.includes('reading') || subLower.includes('rdg')) { s.r = d.isEXS; s.rGds = d.isGDS; }
                if (subLower.includes('writing') || subLower.includes('wri')) { s.w = d.isEXS; s.wGds = d.isGDS; }
                if (subLower.includes('math') || subLower.includes('mat')) { s.m = d.isEXS; s.mGds = d.isGDS; }
            });
            const students = Array.from(studentMap.values());
            const total = students.length;

            const isEYFS = stageMatches.includes('EYFS') || stageMatches.includes('EYF');
            if (isEYFS) {
                const exs = students.filter(s => checkStudentGld(s.assessments)).length;
                return {
                    total,
                    exsRate: total > 0 ? ((exs / total) * 100).toFixed(1) : 0,
                    gdsRate: null,
                    avgScore: null
                };
            } else {
                const exs = students.filter(s => s.r && s.w && s.m).length;
                const gds = students.filter(s => s.rGds && s.wGds && s.mGds).length;
                return {
                    total,
                    exsRate: total > 0 ? ((exs / total) * 100).toFixed(1) : 0,
                    gdsRate: total > 0 ? ((gds / total) * 100).toFixed(1) : 0,
                    avgScore: null
                };
            }
        } else {
            subData = stageData.filter(d => 
                subjectQueries.some(q => String(d.subject || d.rawSubject || '').toLowerCase().includes(q.toLowerCase()))
            );
            if (recordFilter) {
                subData = subData.filter(recordFilter);
            }
        }

        const total = subData.length;
        if (total === 0) return { total: 0, exsRate: '0.0', gdsRate: '0.0', avgScore: null };

        const exs = attainmentFilter 
            ? subData.filter(attainmentFilter).length
            : subData.filter(d => d.isEXS).length;
            
        const gds = subData.filter(d => d.isGDS).length;
        
        const validScores = subData.filter(s => s.markValue !== null && !isNaN(s.markValue));
        const avgScore = validScores.length > 0 
            ? (validScores.reduce((acc, s) => acc + s.markValue, 0) / validScores.length).toFixed(1)
            : null;

        return {
            total,
            exsRate: ((exs / total) * 100).toFixed(1),
            gdsRate: ((gds / total) * 100).toFixed(1),
            avgScore
        };
    };

    // Live benchmark stats calculator - this year's cohort only (combines provisional, disapplied, and Pupil Premium subsets)
    const getLiveBenchmarkStats = (stageMatches, subjectQueries, isCombined = false, targetYearGroupCheck = null, attainmentFilter = null, filterPP = false, excludeDisapplied = true) => {
        let stageData = enrichedData.filter(d => d.isCurrentAcademicYear).filter(d =>
            stageMatches.includes(String(d.stage).toUpperCase().trim())
        );

        if (excludeDisapplied) {
            stageData = stageData.filter(d => !d.disapplied);
        }

        if (targetYearGroupCheck) {
            stageData = stageData.filter(d => targetYearGroupCheck(d.yearGroup));
        }

        if (filterPP) {
            stageData = stageData.filter(d => d.pupilPremium === 'Yes' || d.pupilPremium === '1');
        }

        let subData = stageData;

        if (isCombined) {
            const studentMap = new Map();
            stageData.forEach(d => {
                if (!d.upn) return;
                const key = normalizeUPN(d.upn);
                if (!studentMap.has(key)) {
                    studentMap.set(key, { 
                        assessments: [], 
                        r: false, w: false, m: false, 
                        rGds: false, wGds: false, mGds: false 
                    });
                }
                const s = studentMap.get(key);
                s.assessments.push(d);
                const subLower = String(d.subject || '').toLowerCase();
                if (subLower.includes('reading') || subLower.includes('rdg')) { s.r = d.isEXS; s.rGds = d.isGDS; }
                if (subLower.includes('writing') || subLower.includes('wri')) { s.w = d.isEXS; s.wGds = d.isGDS; }
                if (subLower.includes('math') || subLower.includes('mat')) { s.m = d.isEXS; s.mGds = d.isGDS; }
            });
            const students = Array.from(studentMap.values());
            const total = students.length;

            const isEYFS = stageMatches.includes('EYFS') || stageMatches.includes('EYF');
            if (isEYFS) {
                const exs = students.filter(s => checkStudentGld(s.assessments)).length;
                return total > 0 ? `${((exs / total) * 100).toFixed(0)}%` : '-';
            } else {
                const isHigh = attainmentFilter === 'high';
                const count = students.filter(s => isHigh ? (s.rGds && s.wGds && s.mGds) : (s.r && s.w && s.m)).length;
                return total > 0 ? `${((count / total) * 100).toFixed(0)}%` : '-';
            }
        } else {
            subData = stageData.filter(d => 
                subjectQueries.some(q => String(d.subject || d.rawSubject || '').toLowerCase().includes(q.toLowerCase()))
            );
        }

        const total = subData.length;
        if (total === 0) return '-';

        if (attainmentFilter === 'average_score') {
            const validScores = subData.filter(s => s.markValue !== null && !isNaN(s.markValue));
            return validScores.length > 0 
                ? (validScores.reduce((acc, s) => acc + s.markValue, 0) / validScores.length).toFixed(1)
                : '-';
        }

        const exs = typeof attainmentFilter === 'function' 
            ? subData.filter(attainmentFilter).length
            : subData.filter(d => d.isEXS).length;
            
        return `${((exs / total) * 100).toFixed(0)}%`;
    };

    const getLiveMetric = (stageMatches, subjectQueries, isCombined = false, targetYearGroupCheck = null, attainmentFilter = null, filterPP = false, excludeDisapplied = true) => {
        const calculated = getLiveBenchmarkStats(stageMatches, subjectQueries, isCombined, targetYearGroupCheck, attainmentFilter, filterPP, excludeDisapplied);
        return calculated !== '-' ? calculated : 'No data yet';
    };

    // IDSR-sourced comparator (previous year's school result + national average).
    const getIdsrComparator = (path, yearLabel = idsrData?.meta?.latestComparatorYear || '24/25') => {
        const node = path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), idsrData);
        const yearNode = node ? node[yearLabel] : undefined;
        return yearNode 
            ? { school: `${yearNode.school}%`, national: `${yearNode.national}%` }
            : { school: 'N/A', national: 'N/A' };
    };

    // Active phase statistics calculator
    const phaseStats = useMemo(() => {
        return {
            ks2: {
                rwm: getStageSubjectStats(['2', 'KS2'], ['reading', 'writing', 'maths'], true, null, isYear6),
                reading: getStageSubjectStats(['2', 'KS2'], ['reading', 'rdg'], false, null, isYear6),
                writing: getStageSubjectStats(['2', 'KS2'], ['writing', 'wri'], false, null, isYear6),
                maths: getStageSubjectStats(['2', 'KS2'], ['math', 'mat'], false, null, isYear6),
                gps: getStageSubjectStats(['2', 'KS2'], ['gps', 'spag', 'grammar'], false, null, isYear6),
                science: getStageSubjectStats(['2', 'KS2'], ['science', 'sci'], false, null, isYear6),
            },
            ks1: {
                reading: getStageSubjectStats(['1', 'KS1'], ['reading', 'rdg'], false, null, isYear2),
                writing: getStageSubjectStats(['1', 'KS1'], ['writing', 'wri'], false, null, isYear2),
                maths: getStageSubjectStats(['1', 'KS1'], ['math', 'mat'], false, null, isYear2),
                science: getStageSubjectStats(['1', 'KS1'], ['science', 'sci'], false, null, isYear2),
            },
            mtc: {
                check: getStageSubjectStats(['MTC', '4'], ['multiplication', 'mtc'], false, null, isYear4),
            },
            phonics: {
                y1: getStageSubjectStats(['PHO', '1'], ['phonics', 'pho'], false, (d) => !d.subject?.includes('Y2'), isYear1),
                y2: getStageSubjectStats(['PHO', '2'], ['phonics', 'pho'], false, (d) => d.subject?.includes('Y2') || d.stage === '2', isYear2),
            },
            eyfs: {
                gld: getStageSubjectStats(['EYFS', 'EYF'], ['gld', 'good level of development'], true, null, isReception),
            }
        };
    }, [filteredYearData]);

    // Active Subject filter logic
    const activeSubjectData = useMemo(() => {
        const baseFiltered = filteredYearData.filter(d => {
            if ((yearFilter === '2025/26' || yearFilter === '25/26') && selectedSubject.yearGroupCheck && !selectedSubject.yearGroupCheck(d.yearGroup)) return false;
            return true;
        });

        if (selectedSubject.isCombined) {
            const stageData = baseFiltered.filter(d => 
                selectedSubject.stageMatches.includes(String(d.stage).toUpperCase().trim())
            );
            
            const studentMap = new Map();
            stageData.forEach(d => {
                if (!d.upn) return;
                const key = normalizeUPN(d.upn);
                if (!studentMap.has(key)) {
                    studentMap.set(key, { 
                        name: d.name, 
                        upn: d.upn, 
                        sex: d.sex,
                        pupilPremium: d.pupilPremium,
                        sen: d.sen,
                        eal: d.eal,
                        summerBorn: d.summerBorn,
                        inYearAdmission: d.inYearAdmission,
                        assessments: [],
                        r: false, w: false, m: false, 
                        rGds: false, wGds: false, mGds: false,
                        disapplied: d.disapplied
                    });
                }
                const s = studentMap.get(key);
                s.assessments.push(d);
                const subLower = String(d.subject || '').toLowerCase();
                if (subLower.includes('reading') || subLower.includes('rdg')) { s.r = d.isEXS; s.rGds = d.isGDS; }
                if (subLower.includes('writing') || subLower.includes('wri')) { s.w = d.isEXS; s.wGds = d.isGDS; }
                if (subLower.includes('math') || subLower.includes('mat')) { s.m = d.isEXS; s.mGds = d.isGDS; }
            });

            const students = Array.from(studentMap.values());

            const isEYFS = selectedSubject.stageMatches.includes('EYFS') || selectedSubject.stageMatches.includes('EYF');
            if (isEYFS) {
                return students.map(s => {
                    const metGLD = checkStudentGld(s.assessments);
                    return {
                        name: s.name,
                        upn: s.upn,
                        subject: 'Good Level of Development (GLD)',
                        stage: 'EYFS',
                        sex: s.sex,
                        pupilPremium: s.pupilPremium,
                        sen: s.sen,
                        eal: s.eal,
                        summerBorn: s.summerBorn,
                        inYearAdmission: s.inYearAdmission,
                        isEXS: metGLD,
                        isGDS: false,
                        markValue: null,
                        displayResult: metGLD ? 'Expected' : 'Emerging',
                        disapplied: s.disapplied
                    };
                });
            } else {
                return students.map(s => ({
                    name: s.name,
                    upn: s.upn,
                    subject: 'RWM Combined',
                    stage: 'KS2',
                    sex: s.sex,
                    pupilPremium: s.pupilPremium,
                    sen: s.sen,
                    eal: s.eal,
                    summerBorn: s.summerBorn,
                    inYearAdmission: s.inYearAdmission,
                    isEXS: s.r && s.w && s.m,
                    isGDS: s.rGds && s.wGds && s.mGds,
                    markValue: null,
                    displayResult: (s.rGds && s.wGds && s.mGds) ? 'GDS' : (s.r && s.w && s.m) ? 'EXS' : 'WTS',
                    disapplied: s.disapplied
                }));
            }
        }

        // Standard filter
        return baseFiltered.filter(d => {
            const matchesStage = selectedSubject.stageMatches.includes(String(d.stage).toUpperCase().trim());
            const matchesQueries = selectedSubject.subjectQueries.some(q => 
                String(d.subject || d.rawSubject || '').toLowerCase().includes(q.toLowerCase())
            );
            const matchesCustom = !selectedSubject.customFilter || selectedSubject.customFilter(d);
            return matchesStage && matchesQueries && matchesCustom;
        });
    }, [filteredYearData, selectedSubject]);

    // Deep dive analytics calculations
    const activeStudents = useMemo(() => activeSubjectData.filter(d => !d.disapplied), [activeSubjectData]);
    
    const avgScore = useMemo(() => {
        const validScores = activeStudents.filter(s => s.markValue !== null && !isNaN(s.markValue));
        return validScores.length > 0 
            ? (validScores.reduce((acc, s) => acc + s.markValue, 0) / validScores.length).toFixed(1)
            : null;
    }, [activeStudents]);

    const exsRate = useMemo(() => {
        const exsCount = activeStudents.filter(d => d.isEXS).length;
        return activeStudents.length > 0 ? ((exsCount / activeStudents.length) * 100).toFixed(1) : 0;
    }, [activeStudents]);

    const eyfsGldAreasStats = useMemo(() => {
        if (activePhase !== 'EYFS' || activeSubjectData.length === 0) return null;

        const upns = new Set(activeSubjectData.map(d => normalizeUPN(d.upn)));
        const eyfsRawRows = filteredYearData.filter(d => 
            (d.stage === 'EYFS' || d.stage === 'EYF') && upns.has(normalizeUPN(d.upn))
        );

        const studentAssessments = new Map();
        eyfsRawRows.forEach(row => {
            const key = normalizeUPN(row.upn);
            if (!studentAssessments.has(key)) studentAssessments.set(key, []);
            studentAssessments.get(key).push(row);
        });

        let comPass = 0;
        let psePass = 0;
        let phyPass = 0;
        let litPass = 0;
        let matPass = 0;
        const total = upns.size;

        upns.forEach(upn => {
            const assessments = studentAssessments.get(upn) || [];
            const met = new Set();
            assessments.forEach(row => {
                const sub = String(row.subject || '').toLowerCase();
                const res = String(row.result || '').trim();
                const isExpected = res === '2' || res.toLowerCase().includes('exp');
                
                if (isExpected) {
                    if (sub.includes('com-e01') || sub.includes('listening, attention')) met.add('COM1');
                    if (sub.includes('com-e02') || sub.includes('speaking')) met.add('COM2');
                    if (sub.includes('phy-e06') || sub.includes('gross motor')) met.add('PHY1');
                    if (sub.includes('phy-e07') || sub.includes('fine motor') || sub.includes('phy-e08')) met.add('PHY2');
                    if (sub.includes('pse-e03') || sub.includes('self-regulation') || sub.includes('self regulation')) met.add('PSE1');
                    if (sub.includes('pse-e04') || sub.includes('managing self')) met.add('PSE2');
                    if (sub.includes('pse-e05') || sub.includes('building relationships')) met.add('PSE3');
                    if (sub.includes('lit-e08') || sub.includes('comprehension')) met.add('LIT1');
                    if (sub.includes('lit-e09') || sub.includes('word reading')) met.add('LIT2');
                    if (sub.includes('lit-e10') || sub.includes('writing')) met.add('LIT3');
                    if (sub.includes('mat-e11') || sub.includes('number')) met.add('MAT1');
                    if (sub.includes('mat-e12') || sub.includes('numerical patterns')) met.add('MAT2');
                }
            });

            if (met.has('COM1') && met.has('COM2')) comPass++;
            if (met.has('PSE1') && met.has('PSE2') && met.has('PSE3')) psePass++;
            if (met.has('PHY1') && met.has('PHY2')) phyPass++;
            if (met.has('LIT1') && met.has('LIT2') && met.has('LIT3')) litPass++;
            if (met.has('MAT1') && met.has('MAT2')) matPass++;
        });

        const getPct = (pass) => total > 0 ? Math.round((pass / total) * 100) : 0;

        return [
            { id: 'com', label: 'Communication & Language', percentage: getPct(comPass), count: comPass },
            { id: 'pse', label: 'Personal & Social (PSED)', percentage: getPct(psePass), count: psePass },
            { id: 'phy', label: 'Physical Development', percentage: getPct(phyPass), count: phyPass },
            { id: 'lit', label: 'Literacy', percentage: getPct(litPass), count: litPass },
            { id: 'mat', label: 'Mathematics', percentage: getPct(matPass), count: matPass }
        ];
    }, [activePhase, activeSubjectData, filteredYearData]);

    const gdsSupported = useMemo(() => {
        return activeSubjectData.some(d => d.isGDS);
    }, [activeSubjectData]);

    const gdsRate = useMemo(() => {
        if (!gdsSupported) return null;
        const gdsCount = activeStudents.filter(d => d.isGDS).length;
        return activeStudents.length > 0 ? ((gdsCount / activeStudents.length) * 100).toFixed(1) : 0;
    }, [activeStudents, gdsSupported]);

    // Score Distribution Calculations
    const scoreDistribution = useMemo(() => {
        const counts = {};
        const displayStudents = activeSubjectData.filter(d => showDisapplied || !d.disapplied);
        const total = displayStudents.length;
        
        displayStudents.forEach(d => {
            const res = d.displayResult || d.result || 'No Result';
            counts[res] = (counts[res] || 0) + 1;
        });

        return Object.entries(counts).map(([label, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return {
                label,
                count,
                percentage,
                students: displayStudents.filter(d => (d.displayResult || d.result || 'No Result') === label)
            };
        }).sort((a, b) => b.count - a.count);
    }, [activeSubjectData, showDisapplied]);

    // Demographic Gaps Calculations
    const demographicGaps = useMemo(() => {
        const calculateGap = (key, val1, val2, label1, label2) => {
            const g1 = activeStudents.filter(d => d[key] === val1);
            const g2 = activeStudents.filter(d => d[key] === val2);
            
            const p1 = g1.length ? (g1.filter(d => d.isEXS).length / g1.length) * 100 : 0;
            const p2 = g2.length ? (g2.filter(d => d.isEXS).length / g2.length) * 100 : 0;
            
            const gap = (p1 - p2).toFixed(1);
            
            return {
                group1: { name: label1, total: g1.length, percentage: p1.toFixed(1) },
                group2: { name: label2, total: g2.length, percentage: p2.toFixed(1) },
                gap
            };
        };

        const calculateSexGap = () => {
            const males = activeStudents.filter(d => d.sex === 'M' || d.sex === 'Male');
            const females = activeStudents.filter(d => d.sex === 'F' || d.sex === 'Female');
            
            const p1 = males.length ? (males.filter(d => d.isEXS).length / males.length) * 100 : 0;
            const p2 = females.length ? (females.filter(d => d.isEXS).length / females.length) * 100 : 0;
            
            const gap = (p1 - p2).toFixed(1);
            
            return {
                group1: { name: 'Male', total: males.length, percentage: p1.toFixed(1) },
                group2: { name: 'Female', total: females.length, percentage: p2.toFixed(1) },
                gap
            };
        };

        return [
            { name: 'Pupil Premium', ...calculateGap('pupilPremium', 'Yes', 'No', 'PP', 'Non-PP') },
            { name: 'SEN', ...calculateGap('sen', 'Yes', 'No', 'SEN', 'Non-SEN') },
            { name: 'EAL', ...calculateGap('eal', 'Yes', 'No', 'EAL', 'Non-EAL') },
            { name: 'Sex', ...calculateSexGap() },
            { name: 'Summer Born', ...calculateGap('summerBorn', 'Yes', 'No', 'Summer Born', 'Not Summer Born') },
            { name: 'In Year Admission', ...calculateGap('inYearAdmission', 'Yes', 'No', 'In Year', 'Not In Year') },
        ];
    }, [activeStudents]);

    // Student register searching
    const searchedPupils = useMemo(() => {
        const base = activeSubjectData.filter(d => showDisapplied || !d.disapplied);
        if (!pupilSearch) return base;
        const q = pupilSearch.toLowerCase().trim();
        return base.filter(d => 
            String(d.name).toLowerCase().includes(q) || 
            String(d.upn).toLowerCase().includes(q)
        );
    }, [activeSubjectData, pupilSearch, showDisapplied]);

    // Progress Engine (KS1 to KS2 matches)
    const progressData = useMemo(() => {
        if (!enrichedData.length) return [];
        
        const studentMap = new Map();
        enrichedData.forEach(d => {
            if (!d.upn) return;
            if (!studentMap.has(d.upn)) studentMap.set(d.upn, []);
            studentMap.get(d.upn).push(d);
        });

        const progressRows = [];
        studentMap.forEach((results, upn) => {
            const ks1 = results.find(r => r.stage === '1' || r.stage === 'KS1');
            const ks2 = results.find(r => r.stage === '2' || r.stage === 'KS2');
            
            if (ks1 && ks2) {
                progressRows.push({
                    name: ks1.name,
                    upn,
                    ks1Result: ks1.displayResult,
                    ks2Result: ks2.displayResult,
                    pp: ks1.pupilPremium,
                    sen: ks1.sen,
                    isImproved: (ks2.isEXS && !ks1.isEXS) || (ks1.isEXS && ks2.isEXS),
                    isDeclined: (!ks2.isEXS && ks1.isEXS)
                });
            }
        });
        return progressRows;
    }, [enrichedData]);

    const handleDrillDown = (title, subjectStats, type) => {
        let label = 'EXS+';
        if (type === 'gds') label = 'GDS';
        if (type === 'wts') label = 'WTS/BLW';

        // Filter search list
        const matchingStudents = activeSubjectData.filter(student => {
            if (student.disapplied) return false;
            if (type === 'exs') return student.isEXS;
            if (type === 'gds') return student.isGDS;
            if (type === 'wts') return !student.isEXS;
            return true;
        });

        setDrillDownGroup({
            title: `${title} (${label})`,
            students: matchingStudents
        });
    };

    const renderBenchmarkRow = (id, label, { stage, subjects, isCombined = false, yearGroupCheck, attainment = null, idsrPath = null, hasPostDisapply = true }) => {
        const provisional = getLiveMetric(stage, subjects, isCombined, yearGroupCheck, attainment, false, false);
        const postDisapply = hasPostDisapply ? getLiveMetric(stage, subjects, isCombined, yearGroupCheck, attainment, false, true) : '-';
        const pp = getLiveMetric(stage, subjects, isCombined, yearGroupCheck, attainment, true, hasPostDisapply);
        const idsr = idsrPath ? getIdsrComparator(idsrPath) : { school: 'N/A', national: 'N/A' };

        return (
            <tr key={id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 font-bold text-gray-700 text-sm">{label}</td>
                <td className="py-4 px-4 text-center text-sm text-gray-600 bg-gray-50/50">{provisional}</td>
                <td className="py-4 px-4 text-center text-sm font-bold text-indigo-700 bg-indigo-50/30">{postDisapply}</td>
                <td className="py-4 px-4 text-center text-xs text-gray-400 italic">Awaiting DfE</td>
                <td className="py-4 px-4 text-center text-sm text-purple-700 font-bold">{pp}</td>
            </tr>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Statutory Assessments</h1>
                    <p className="text-gray-500 text-sm mt-1">National exam records, historical benchmarks and CTF data integration</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-lg border border-gray-200">
                    <button 
                        onClick={() => { setActiveSection('analysis'); setDrillDownGroup(null); }}
                        className={cn("px-4 py-2 rounded-md font-medium text-xs uppercase tracking-wider transition-all flex items-center gap-2", 
                            activeSection === 'analysis' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800")}
                    >
                        <BarChart3 className="w-4 h-4" /> Dashboard
                    </button>
                    <button 
                        onClick={() => { setActiveSection('progress'); setDrillDownGroup(null); }}
                        className={cn("px-4 py-2 rounded-md font-medium text-xs uppercase tracking-wider transition-all flex items-center gap-2", 
                            activeSection === 'progress' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800")}
                    >
                        <TrendingUp className="w-4 h-4" /> KS1-2 Progress
                    </button>
                    <button 
                        onClick={() => { setActiveSection('benchmarks'); setDrillDownGroup(null); }}
                        className={cn("px-4 py-2 rounded-md font-medium text-xs uppercase tracking-wider transition-all flex items-center gap-2", 
                            activeSection === 'benchmarks' ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800")}
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Benchmarks Table
                    </button>
                </div>
            </div>

            {activeSection === 'analysis' && (
                <div className="space-y-6">
                    {persistedData.length === 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 text-center space-y-3">
                            <Database className="w-10 h-10 text-yellow-500 mx-auto" />
                            <h3 className="text-base font-bold text-yellow-800">No Persisted Statutory Data Found</h3>
                            <p className="text-xs text-yellow-700 max-w-lg mx-auto">
                                The statutory data list is currently empty. Please confirm that your Google Sheet has data on the <strong>'25/26'</strong> tab.
                            </p>
                        </div>
                    )}

                    {persistedData.length > 0 && enrichedData.length === 0 && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 text-center space-y-3">
                            <FileWarning className="w-10 h-10 text-orange-500 mx-auto" />
                            <h3 className="text-base font-bold text-orange-800">Parsing Layout Issue</h3>
                            <p className="text-xs text-orange-700 max-w-lg mx-auto">
                                We retrieved {persistedData.length} records, but could not map them to the expected statutory fields. 
                                Identified columns: <code className="bg-orange-100 px-1.5 py-0.5 rounded font-mono text-[10px] break-all">{Object.keys(persistedData[0] || {}).join(', ')}</code>.
                            </p>
                        </div>
                    )}

                    {persistedData.length > 0 && activeSubjectData.length === 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-3 text-left">
                            <h3 className="text-sm font-bold text-blue-800">Diagnostics: No active cohort records found</h3>
                            <p className="text-xs text-blue-700">
                                Although statutory records are loaded, they aren't matching the selected phase filter. Here is what we see in the database:
                            </p>
                            <div className="text-xs space-y-1.5 bg-white p-3 rounded border border-blue-100 max-h-56 overflow-y-auto font-mono text-gray-700">
                                <div>Total records in statutory sheet: <strong>{persistedData.length}</strong></div>
                                <div>Total mapped records: <strong>{enrichedData.length}</strong></div>
                                <div>Current Phase Filter: <strong>{activePhase}</strong> (expects year groups: <strong>{
                                    activePhase === 'KS2' ? 'Year 6' : 
                                    activePhase === 'KS1' ? 'Year 2' : 
                                    activePhase === 'MTC' ? 'Year 4' : 
                                    activePhase === 'Phonics' ? 'Year 1 & 2' : 'Reception'
                                }</strong>)</div>
                                <div className="mt-1 font-semibold text-blue-900 border-t border-blue-100 pt-1">
                                    Demographics Year Groups: <strong>{[...new Set(mainData.map(d => d.yearGroup).filter(Boolean))].join(', ')}</strong>
                                </div>
                                <div>
                                    Total matching isReception in demographics: <strong>{mainData.filter(d => isReception(d.yearGroup)).length}</strong>
                                </div>
                                <div className="text-[10px] text-gray-500 space-y-0.5 mt-1 border-t border-blue-50 pt-1">
                                    <div>Kensington Main Sheet Tabs: <code className="bg-gray-100 px-1 rounded">{kensingtonTabs.join(', ') || 'Loading...'}</code></div>
                                    <div>Statutory Sheet Tabs: <code className="bg-gray-100 px-1 rounded">{statutoryTabs.join(', ') || 'Loading...'}</code></div>
                                </div>
                                <div className="font-bold mt-3 text-blue-800 border-b border-gray-100 pb-1">First 5 records parsed:</div>
                                {enrichedData.slice(0, 5).map((row, idx) => {
                                    const matchDemo = mainData.some(d => normalizeUPN(d.upn) === normalizeUPN(row.upn));
                                    const demoInfo = mainData.find(d => normalizeUPN(d.upn) === normalizeUPN(row.upn));
                                    return (
                                        <div key={idx} className="border-t border-gray-100 pt-1 mt-1 text-[10px] space-y-0.5">
                                            <div className="font-semibold text-gray-800">Row {idx + 1}: {row.name}</div>
                                            <div>UPN: {row.upn || 'N/A'} (In Main Demographics? {matchDemo ? `YES (Year: "${demoInfo?.yearGroup || 'N/A'}")` : 'NO'})</div>
                                            <div>Stage: {row.stage || 'N/A'} | Subject: {row.subject || 'N/A'} | Result: {row.result || 'N/A'}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Control Panel - Filters */}
                    <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                        
                        {/* Year Filter */}
                        <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg flex flex-col min-w-[120px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Academic Year</span>
                            <select 
                                value={yearFilter} 
                                onChange={(e) => setYearFilter(e.target.value)} 
                                className="bg-transparent font-bold text-sm text-gray-800 focus:outline-none cursor-pointer mt-0.5"
                            >
                                {availableYears.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        </div>

                        {/* Phase Filter Dropdown */}
                        <div className="px-3 py-1.5 bg-indigo-50/50 border border-indigo-100 rounded-lg flex flex-col min-w-[220px]">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">School Phase</span>
                            <select 
                                value={activePhase} 
                                onChange={(e) => setActivePhase(e.target.value)} 
                                className="bg-transparent font-bold text-sm text-indigo-950 focus:outline-none cursor-pointer mt-0.5"
                            >
                                <option value="KS2">Key Stage 2 (Year 6)</option>
                                <option value="KS1">Key Stage 1 (Year 2)</option>
                                <option value="MTC">MTC (Year 4 Check)</option>
                                <option value="Phonics">Phonics (Year 1 & 2)</option>
                                <option value="EYFS">EYFS (GLD Reception)</option>
                            </select>
                        </div>

                        {/* Disapplied Filter */}
                        <button
                            onClick={() => setShowDisapplied(!showDisapplied)}
                            className={cn("flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-semibold shadow-sm transition-colors",
                                showDisapplied ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50")}
                        >
                            {showDisapplied ? 'Hide Disapplied' : 'Show Disapplied'}
                        </button>

                        <div className="ml-auto bg-gray-50 border border-gray-200 rounded-lg px-4 py-1.5 text-center min-w-[120px]">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Total Pupils</span>
                            <div className="text-lg font-bold text-gray-800 mt-0.5">
                                {new Set(activeSubjectData.filter(d => showDisapplied || !d.disapplied).map(d => d.upn)).size}
                            </div>
                        </div>
                    </div>

                    {/* Phase-Specific Overview cards */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">
                                {activePhase === 'KS2' && 'Key Stage 2 Overview (Year 6 Outcomes)'}
                                {activePhase === 'KS1' && 'Key Stage 1 Overview (Year 2 Outcomes)'}
                                {activePhase === 'MTC' && 'Multiplication Tables Check Overview (Year 4 Check)'}
                                {activePhase === 'Phonics' && 'Phonics Screening Check Overview'}
                                {activePhase === 'EYFS' && 'Early Years Foundation Stage (Reception Outcomes)'}
                            </h2>
                            <p className="text-xs text-gray-400 mt-0.5">Select an assessment card below to view detailed breakdown analysis</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {activePhase === 'KS2' && (
                                <>
                                    <StatScoreCard title="RWM Combined" stats={phaseStats.ks2.rwm} isSelected={selectedSubject.title === 'RWM Combined'} onClick={() => setSelectedSubject({ title: 'RWM Combined', stageMatches: ['2', 'KS2'], subjectQueries: ['reading', 'writing', 'maths'], isCombined: true, yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("RWM Combined", phaseStats.ks2.rwm, type)} />
                                    <StatScoreCard title="KS2 Reading" stats={phaseStats.ks2.reading} isSelected={selectedSubject.title === 'KS2 Reading'} onClick={() => setSelectedSubject({ title: 'KS2 Reading', stageMatches: ['2', 'KS2'], subjectQueries: ['reading', 'rdg'], yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("KS2 Reading", phaseStats.ks2.reading, type)} />
                                    <StatScoreCard title="KS2 Writing (TA)" stats={phaseStats.ks2.writing} isSelected={selectedSubject.title === 'KS2 Writing'} onClick={() => setSelectedSubject({ title: 'KS2 Writing', stageMatches: ['2', 'KS2'], subjectQueries: ['writing', 'wri'], yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("KS2 Writing", phaseStats.ks2.writing, type)} />
                                    <StatScoreCard title="KS2 Mathematics" stats={phaseStats.ks2.maths} isSelected={selectedSubject.title === 'KS2 Mathematics'} onClick={() => setSelectedSubject({ title: 'KS2 Mathematics', stageMatches: ['2', 'KS2'], subjectQueries: ['math', 'mat'], yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("KS2 Mathematics", phaseStats.ks2.maths, type)} />
                                    <StatScoreCard title="KS2 GPS (SPaG)" stats={phaseStats.ks2.gps} isSelected={selectedSubject.title === 'KS2 GPS (SPaG)'} onClick={() => setSelectedSubject({ title: 'KS2 GPS (SPaG)', stageMatches: ['2', 'KS2'], subjectQueries: ['gps', 'spag', 'grammar'], yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("KS2 GPS (SPaG)", phaseStats.ks2.gps, type)} />
                                    <StatScoreCard title="KS2 Science" stats={phaseStats.ks2.science} hideGDS isSelected={selectedSubject.title === 'KS2 Science'} onClick={() => setSelectedSubject({ title: 'KS2 Science', stageMatches: ['2', 'KS2'], subjectQueries: ['science', 'sci'], yearGroupCheck: isYear6 })} onDrillDown={(type) => handleDrillDown("KS2 Science", phaseStats.ks2.science, type)} />
                                </>
                            )}

                            {activePhase === 'KS1' && (
                                <>
                                    <StatScoreCard title="KS1 Reading" stats={phaseStats.ks1.reading} isSelected={selectedSubject.title === 'KS1 Reading'} onClick={() => setSelectedSubject({ title: 'KS1 Reading', stageMatches: ['1', 'KS1'], subjectQueries: ['reading', 'rdg'], yearGroupCheck: isYear2 })} onDrillDown={(type) => handleDrillDown("KS1 Reading", phaseStats.ks1.reading, type)} />
                                    <StatScoreCard title="KS1 Writing" stats={phaseStats.ks1.writing} isSelected={selectedSubject.title === 'KS1 Writing'} onClick={() => setSelectedSubject({ title: 'KS1 Writing', stageMatches: ['1', 'KS1'], subjectQueries: ['writing', 'wri'], yearGroupCheck: isYear2 })} onDrillDown={(type) => handleDrillDown("KS1 Writing", phaseStats.ks1.writing, type)} />
                                    <StatScoreCard title="KS1 Mathematics" stats={phaseStats.ks1.maths} isSelected={selectedSubject.title === 'KS1 Mathematics'} onClick={() => setSelectedSubject({ title: 'KS1 Mathematics', stageMatches: ['1', 'KS1'], subjectQueries: ['math', 'mat'], yearGroupCheck: isYear2 })} onDrillDown={(type) => handleDrillDown("KS1 Mathematics", phaseStats.ks1.maths, type)} />
                                    <StatScoreCard title="KS1 Science" stats={phaseStats.ks1.science} hideGDS isSelected={selectedSubject.title === 'KS1 Science'} onClick={() => setSelectedSubject({ title: 'KS1 Science', stageMatches: ['1', 'KS1'], subjectQueries: ['science', 'sci'], yearGroupCheck: isYear2 })} onDrillDown={(type) => handleDrillDown("KS1 Science", phaseStats.ks1.science, type)} />
                                </>
                            )}

                            {activePhase === 'MTC' && (
                                <StatScoreCard title="Multiplication Check (MTC)" stats={phaseStats.mtc.check} isSelected={selectedSubject.title === 'Multiplication Check'} onClick={() => setSelectedSubject({ title: 'Multiplication Check', stageMatches: ['MTC', '4'], subjectQueries: ['multiplication', 'mtc'], yearGroupCheck: isYear4 })} onDrillDown={(type) => handleDrillDown("Multiplication Check", phaseStats.mtc.check, type)} />
                            )}

                            {activePhase === 'Phonics' && (
                                <>
                                    <StatScoreCard title="Phonics (Y1 Screen)" stats={phaseStats.phonics.y1} isSelected={selectedSubject.title === 'Phonics (Y1)'} onClick={() => setSelectedSubject({ title: 'Phonics (Y1)', stageMatches: ['PHO', '1'], subjectQueries: ['phonics', 'pho'], customFilter: (d) => !d.subject?.includes('Y2'), yearGroupCheck: isYear1 })} onDrillDown={(type) => handleDrillDown("Phonics (Y1)", phaseStats.phonics.y1, type)} />
                                    <StatScoreCard title="Phonics (Y2 Resit)" stats={phaseStats.phonics.y2} isSelected={selectedSubject.title === 'Phonics (Y2 Resit)'} onClick={() => setSelectedSubject({ title: 'Phonics (Y2 Resit)', stageMatches: ['PHO', '2'], subjectQueries: ['phonics', 'pho'], customFilter: (d) => d.subject?.includes('Y2') || d.stage === '2', yearGroupCheck: isYear2 })} onDrillDown={(type) => handleDrillDown("Phonics (Y2 Resit)", phaseStats.phonics.y2, type)} />
                                </>
                            )}

                            {activePhase === 'EYFS' && (
                                <StatScoreCard title="Reception GLD" stats={phaseStats.eyfs.gld} isSelected={selectedSubject.title === 'Good Level of Development (GLD)'} onClick={() => setSelectedSubject({ title: 'Good Level of Development (GLD)', stageMatches: ['EYFS', 'EYF'], subjectQueries: ['gld', 'good level of development'], isCombined: true, yearGroupCheck: isReception })} onDrillDown={(type) => handleDrillDown("Reception GLD", phaseStats.eyfs.gld, type)} />
                            )}
                        </div>
                    </div>

                    {/* Drill-down matrix section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Analytical details card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Active Subject</span>
                                <h3 className="text-xl font-bold text-gray-900 truncate" title={selectedSubject.title}>{selectedSubject.title}</h3>
                            </div>
                            
                            <div className="mt-6 space-y-4">
                                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-baseline justify-between">
                                    <span className="text-sm font-semibold text-gray-600">Expected Standard+</span>
                                    <span className="text-xl font-bold text-indigo-600">{exsRate}%</span>
                                </div>
                                {gdsSupported && (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-baseline justify-between">
                                        <span className="text-sm font-semibold text-gray-600">Higher Standard (GDS)</span>
                                        <span className="text-xl font-bold text-purple-600">{gdsRate}%</span>
                                    </div>
                                )}
                                {avgScore !== null && (
                                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-baseline justify-between">
                                        <span className="text-sm font-semibold text-gray-600">Average Score</span>
                                        <span className="text-xl font-bold text-gray-900">{avgScore}</span>
                                    </div>
                                )}

                                {eyfsGldAreasStats && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">GLD Area Performance</span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {eyfsGldAreasStats.map(area => {
                                                let bg = 'bg-red-50 text-red-700 border-red-200';
                                                if (area.percentage >= 85) bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                                                else if (area.percentage >= 70) bg = 'bg-teal-50 text-teal-700 border-teal-200';
                                                else if (area.percentage >= 55) bg = 'bg-amber-50 text-amber-700 border-amber-200';

                                                return (
                                                    <div key={area.id} className={cn("p-2 border rounded-lg flex items-center justify-between transition-all", bg)}>
                                                        <span className="text-xs font-semibold">{area.label}</span>
                                                        <span className="text-sm font-bold">{area.percentage}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Distribution chart */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Outcome Distribution</h3>
                            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                                {scoreDistribution.map(item => (
                                    <div key={item.label} className="text-xs">
                                        <div className="flex justify-between font-semibold mb-1">
                                            <span className="text-gray-700">{item.label}</span>
                                            <span className="text-gray-500">{item.percentage}% ({item.count})</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                                        </div>
                                    </div>
                                ))}
                                {scoreDistribution.length === 0 && (
                                    <p className="text-sm text-gray-400 italic text-center py-6">No distribution data available.</p>
                                )}
                            </div>
                        </div>

                        {/* Demographic gaps card */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Demographic Gaps (EXS+)</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-100 text-xs">
                                    <thead>
                                        <tr className="text-gray-400">
                                            <th className="py-2 text-left font-bold uppercase">Metric</th>
                                            <th className="py-2 text-center font-bold uppercase">Subgroup 1</th>
                                            <th className="py-2 text-center font-bold uppercase">Subgroup 2</th>
                                            <th className="py-2 text-right font-bold uppercase">Gap</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {demographicGaps.map(gap => (
                                            <tr key={gap.name} className="hover:bg-gray-50">
                                                <td className="py-2 font-semibold text-gray-700">{gap.name}</td>
                                                <td className="py-2 text-center text-gray-600">{gap.group1.name}: {gap.group1.percentage}% <span className="text-gray-400">({gap.group1.total})</span></td>
                                                <td className="py-2 text-center text-gray-600">{gap.group2.name}: {gap.group2.percentage}% <span className="text-gray-400">({gap.group2.total})</span></td>
                                                <td className={cn("py-2 text-right font-bold", 
                                                    parseFloat(gap.gap) > 0 ? "text-green-600" : parseFloat(gap.gap) < 0 ? "text-rose-600" : "text-gray-500"
                                                )}>
                                                    {parseFloat(gap.gap) > 0 ? '+' : ''}{gap.gap}pp
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Search and pupil register list */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" /> Pupil Register ({searchedPupils.length})
                            </h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search pupils..."
                                    value={pupilSearch}
                                    onChange={e => setPupilSearch(e.target.value)}
                                    className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-48"
                                />
                            </div>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Pupil Name</th>
                                        <th className="px-6 py-3 text-center">UPN</th>
                                        <th className="px-6 py-3 text-center">Sex</th>
                                        <th className="px-6 py-3 text-center">PP</th>
                                        <th className="px-6 py-3 text-center">SEN</th>
                                        <th className="px-6 py-3 text-center">EAL</th>
                                        <th className="px-6 py-3 text-center">Summer</th>
                                        <th className="px-6 py-3 text-center">Result</th>
                                        <th className="px-6 py-3 text-center">Mark</th>
                                        <th className="px-6 py-3 text-right">Disapplied</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 text-xs text-gray-600">
                                    {searchedPupils.map((pupil, i) => (
                                        <tr key={pupil.upn || i} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-semibold text-gray-800 truncate max-w-[180px]">{pupil.name}</td>
                                            <td className="px-6 py-3 text-center text-gray-400 font-mono">{pupil.upn || '-'}</td>
                                            <td className="px-6 py-3 text-center">{pupil.sex || '-'}</td>
                                            <td className="px-6 py-3 text-center">
                                                {pupil.pupilPremium === 'Yes' && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">PP</span>}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {pupil.sen === 'Yes' && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">SEN</span>}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {pupil.eal === 'Yes' && <span className="bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold">EAL</span>}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                {pupil.summerBorn === 'Yes' && <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">Yes</span>}
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded font-bold",
                                                    pupil.isEXS ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {pupil.displayResult}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-center font-bold text-indigo-600">{pupil.markValue ?? '-'}</td>
                                            <td className="px-6 py-3 text-right">
                                                <input
                                                    type="checkbox"
                                                    checked={pupil.disapplied || false}
                                                    onChange={() => handleToggleDisapply(pupil.upn, selectedSubject.title)}
                                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                    {searchedPupils.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="px-6 py-12 text-center text-gray-400 italic">
                                                No pupils found matching query.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'progress' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">KS1 to KS2 Progress Mapping</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Cohort mapping showing progress from Key Stage 1 assessments to Key Stage 2 SATs</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="py-3 px-6 text-left">Pupil Name</th>
                                    <th className="py-3 px-4 text-center">UPN</th>
                                    <th className="py-3 px-4 text-center">KS1 Outcome</th>
                                    <th className="py-3 px-4 text-center">KS2 Outcome</th>
                                    <th className="py-3 px-4 text-center">Demographics</th>
                                    <th className="py-3 px-6 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-600">
                                {progressData.map((row, i) => (
                                    <tr key={row.upn || i} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-6 font-semibold text-gray-800">{row.name}</td>
                                        <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">{row.upn}</td>
                                        <td className="py-3 px-4 text-center font-bold">{row.ks1Result}</td>
                                        <td className="py-3 px-4 text-center font-bold text-indigo-700">{row.ks2Result}</td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                {row.pp === 'Yes' && <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[9px] font-bold px-1 rounded uppercase">PP</span>}
                                                {row.sen === 'Yes' && <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-bold px-1 rounded uppercase">SEN</span>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-right">
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-full",
                                                row.isImproved ? "bg-green-100 text-green-700" :
                                                row.isDeclined ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                            )}>
                                                {row.isImproved ? 'Maintained/Improved' : row.isDeclined ? 'Declined' : 'No Change'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {progressData.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                            No matched KS1 & KS2 progress records found in database.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSection === 'benchmarks' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">National Benchmarking Table</h2>
                        <p className="text-xs text-gray-400 mt-0.5">School statutory outcomes compared with DfE national averages and IDSR records</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                                <tr>
                                    <th className="py-3 px-6 text-left">Key Metric</th>
                                    <th className="py-3 px-4 text-center">Provisional</th>
                                    <th className="py-3 px-4 text-center">Post-Disapply</th>
                                    <th className="py-3 px-4 text-center">National</th>
                                    <th className="py-3 px-4 text-center">PP (School)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-600">
                                <tr className="bg-gray-50/30">
                                    <td colSpan={5} className="py-2 px-6 font-bold text-indigo-700 text-xs uppercase bg-indigo-50/50">Key Stage 2 (Year 6 SATs)</td>
                                </tr>
                                {renderBenchmarkRow('ks2_rwm_exp', 'RWM Combined - Expected Standard', { stage: ['2', 'KS2'], subjects: ['reading', 'writing', 'maths'], isCombined: true, yearGroupCheck: isYear6, idsrPath: 'attainment.rwm.expected' })}
                                {renderBenchmarkRow('ks2_rwm_high', 'RWM Combined - Higher Standard', { stage: ['2', 'KS2'], subjects: ['reading', 'writing', 'maths'], isCombined: true, yearGroupCheck: isYear6, attainment: 'high', idsrPath: 'attainment.rwm.higher' })}
                                {renderBenchmarkRow('ks2_reading_exp', 'Reading - Expected Standard', { stage: ['2', 'KS2'], subjects: ['reading', 'rdg'], yearGroupCheck: isYear6, idsrPath: 'attainment.reading.expected' })}
                                {renderBenchmarkRow('ks2_reading_high', 'Reading - Higher Standard (Score 110+)', { stage: ['2', 'KS2'], subjects: ['reading', 'rdg'], yearGroupCheck: isYear6, attainment: (d) => d.isGDS, idsrPath: 'attainment.reading.higher' })}
                                {renderBenchmarkRow('ks2_reading_avg', 'Reading - Average Scaled Score', { stage: ['2', 'KS2'], subjects: ['reading', 'rdg'], yearGroupCheck: isYear6, attainment: 'average_score', idsrPath: 'attainment.reading.avgScore', hasPostDisapply: false })}
                                {renderBenchmarkRow('ks2_writing_exp', 'Writing - Expected Standard (TA)', { stage: ['2', 'KS2'], subjects: ['writing', 'wri'], yearGroupCheck: isYear6, idsrPath: 'attainment.writing.expected' })}
                                {renderBenchmarkRow('ks2_writing_high', 'Writing - Greater Depth TA (GDS)', { stage: ['2', 'KS2'], subjects: ['writing', 'wri'], yearGroupCheck: isYear6, attainment: (d) => d.isGDS, idsrPath: 'attainment.writing.higher' })}
                                {renderBenchmarkRow('ks2_maths_exp', 'Mathematics - Expected Standard', { stage: ['2', 'KS2'], subjects: ['math', 'mat'], yearGroupCheck: isYear6, idsrPath: 'attainment.maths.expected' })}
                                {renderBenchmarkRow('ks2_maths_high', 'Mathematics - Higher Standard (Score 110+)', { stage: ['2', 'KS2'], subjects: ['math', 'mat'], yearGroupCheck: isYear6, attainment: (d) => d.isGDS, idsrPath: 'attainment.maths.higher' })}
                                {renderBenchmarkRow('ks2_maths_avg', 'Mathematics - Average Scaled Score', { stage: ['2', 'KS2'], subjects: ['math', 'mat'], yearGroupCheck: isYear6, attainment: 'average_score', idsrPath: 'attainment.maths.avgScore', hasPostDisapply: false })}
                                {renderBenchmarkRow('ks2_gps_exp', 'GPS - Expected Standard', { stage: ['2', 'KS2'], subjects: ['gps', 'spag', 'grammar'], yearGroupCheck: isYear6, idsrPath: 'attainment.gps.expected' })}
                                {renderBenchmarkRow('ks2_gps_high', 'GPS - Higher Standard (Score 110+)', { stage: ['2', 'KS2'], subjects: ['gps', 'spag', 'grammar'], yearGroupCheck: isYear6, attainment: (d) => d.isGDS, idsrPath: 'attainment.gps.higher' })}
                                {renderBenchmarkRow('ks2_science_exp', 'Science - Expected Standard (TA)', { stage: ['2', 'KS2'], subjects: ['science', 'sci'], yearGroupCheck: isYear6, idsrPath: 'attainment.science.expected', hasPostDisapply: false })}

                                <tr className="bg-gray-50/30">
                                    <td colSpan={5} className="py-2 px-6 font-bold text-indigo-700 text-xs uppercase bg-indigo-50/50">Key Stage 1 (Year 2 Outcomes)</td>
                                </tr>
                                {renderBenchmarkRow('ks1_reading_exp', 'Reading - Expected Standard', { stage: ['1', 'KS1'], subjects: ['reading', 'rdg'], yearGroupCheck: isYear2, hasPostDisapply: false })}
                                {renderBenchmarkRow('ks1_writing_exp', 'Writing - Expected Standard', { stage: ['1', 'KS1'], subjects: ['writing', 'wri'], yearGroupCheck: isYear2, hasPostDisapply: false })}
                                {renderBenchmarkRow('ks1_maths_exp', 'Mathematics - Expected Standard', { stage: ['1', 'KS1'], subjects: ['math', 'mat'], yearGroupCheck: isYear2, hasPostDisapply: false })}

                                <tr className="bg-gray-50/30">
                                    <td colSpan={5} className="py-2 px-6 font-bold text-indigo-700 text-xs uppercase bg-indigo-50/50">Other Statutory Checks</td>
                                </tr>
                                {renderBenchmarkRow('phonics_y1', 'Phonics Screening - Year 1 Pass (Score 32+)', { stage: ['PHO', '1'], subjects: ['phonics', 'pho'], yearGroupCheck: isYear1, hasPostDisapply: false })}
                                {renderBenchmarkRow('phonics_y2', 'Phonics Screening - Year 2 Resit Pass', { stage: ['PHO', '2'], subjects: ['phonics', 'pho'], yearGroupCheck: isYear2, hasPostDisapply: false })}
                                {renderBenchmarkRow('mtc_pass', 'MTC - Full Marks (25/25)', { stage: ['MTC', '4'], subjects: ['multiplication', 'mtc'], yearGroupCheck: isYear4, hasPostDisapply: false })}
                                {renderBenchmarkRow('eyfs_gld', 'EYFS Good Level of Development (GLD)', { stage: ['EYFS', 'EYF'], subjects: ['gld', 'good level of development'], isCombined: true, yearGroupCheck: isReception, hasPostDisapply: false })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatScoreCard({ title, stats, isSelected, onClick, onDrillDown, hideGDS = false }) {
    if (!stats || !stats.total) return null;
    return (
        <div 
            onClick={onClick}
            className={cn(
                "p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md",
                isSelected ? "border-indigo-500 bg-indigo-50/10 ring-2 ring-indigo-500/10" : "border-gray-200 bg-white hover:border-gray-300"
            )}
        >
            <div>
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{title}</h4>
                <div className="flex items-center justify-between mb-4">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDrillDown('wts'); }}
                        className="text-left group/wts"
                    >
                        <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest block mb-0.5 group-hover/wts:underline">WTS/BLW</span>
                        <div className="text-xl font-bold text-gray-500 group-hover/wts:text-rose-600 transition-colors">{stats.gdsRate !== null ? (100 - parseFloat(stats.exsRate)).toFixed(1) : stats.wtsRate || 0}%</div>
                    </button>
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDrillDown('exs'); }}
                        className="text-center group/exs"
                    >
                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block mb-0.5 group-hover/exs:underline">EXS+</span>
                        <div className="text-3xl font-bold text-gray-900 leading-none">{stats.exsRate}%</div>
                        <div className="text-[9px] text-gray-400 font-medium mt-1">{stats.total} Pupils</div>
                    </button>

                    {!hideGDS && stats.gdsRate !== null && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDrillDown('gds'); }}
                            className="text-right group/gds"
                        >
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest block mb-0.5 group-hover/gds:underline">GDS</span>
                            <div className="text-xl font-bold text-gray-500 group-hover/gds:text-orange-500 transition-colors">{stats.gdsRate}%</div>
                        </button>
                    )}
                </div>
            </div>
            
            {stats.avgScore && (
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[10px]">
                    <span className="font-bold text-gray-400 uppercase tracking-widest">Avg. Scaled Score</span>
                    <div className="font-bold text-indigo-600 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                        {stats.avgScore}
                    </div>
                </div>
            )}
        </div>
    );
}
