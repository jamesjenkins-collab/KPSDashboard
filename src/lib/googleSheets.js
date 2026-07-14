// Modern Google Sheets API using @react-oauth/google and direct API calls

// const SPREADSHEET_ID = '15KCCFS52fGV_6B5OFvAqWuGEufnsH7zmzcWFNmDtg4s';
// const SHEET_RANGE = 'Sheet2!A:N'; // Long format data
const SPREADSHEET_ID = null;
const SHEET_RANGE = null;
// const EYFS_SPREADSHEET_ID = '1W6ao6WEF5A5shoLzY9j_2XBLEQEFbIYXgw9WRPSILqE';
// const EYFS_SHEET_RANGE = 'Long Data!A:I'; // Name ... In Year Admission
const EYFS_SPREADSHEET_ID = null;
const EYFS_SHEET_RANGE = null;
const CULTURAL_SPREADSHEET_ID = '1zFGyt8QvG69wglcc2PIFB1VhTmgdzM8szcDh5DWpzwM';
const CULTURAL_SHEET_RANGE = 'Clubs!A:Z'; // Extended to cover Leaving date and other columns
const TRIPS_SPREADSHEET_ID = '1DbiuwM19Z3VNFWK23enjtMrJfSrP7PLIHahZE8B-ZPA';
const SPORTS_TRIPS_SHEET_RANGE = 'Sports Trips!A:Z';
const STATUTORY_SPREADSHEET_ID = '1vvhM4MOO3Mn5ASrRKOM6F5lp_sLm9uWXmux-FABJvm4';
const STATUTORY_SHEET_RANGE = "'25/26'!A:ZZ";
const API_KEY = "AIzaSyACtP5cKvNsZM3EMUv8jb1VZE1NGS08YaI";

export { SPREADSHEET_ID, SHEET_RANGE, EYFS_SPREADSHEET_ID, EYFS_SHEET_RANGE, CULTURAL_SPREADSHEET_ID, CULTURAL_SHEET_RANGE, TRIPS_SPREADSHEET_ID, SPORTS_TRIPS_SHEET_RANGE, STATUTORY_SPREADSHEET_ID, STATUTORY_SHEET_RANGE };

export const fetchSheetData = async (accessToken, spreadsheetId = SPREADSHEET_ID, range = SHEET_RANGE, returnRaw = false) => {
    try {
        console.log("Fetching...", spreadsheetId, range);

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;

        console.log("Fetch URL:", url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store'
        });

        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Error response:", errorText);
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const data = await response.json();
        console.log("Data received:", data);
        
        if (!data.values || data.values.length === 0) {
            return [];
        }

        // Find true header row (ignoring title block or empty rows for statutory)
        let headerRowIdx = 0;
        if (spreadsheetId === STATUTORY_SPREADSHEET_ID) {
            for (let i = 0; i < Math.min(10, data.values.length); i++) {
                const row = data.values[i];
                if (!row) continue;
                const hasKeyword = row.some(cell => {
                    const val = String(cell || '').toLowerCase();
                    return val.includes('upn') || 
                           val.includes('name') || 
                           val.startsWith('eyf') || 
                           val.startsWith('ks1') || 
                           val.startsWith('ks2') || 
                           val.includes('phonics') || 
                           val.includes('multiplication');
                });
                if (hasKeyword) {
                    headerRowIdx = i;
                    break;
                }
            }
        }

        const headers = data.values[headerRowIdx] || [];
        const rows = data.values.slice(headerRowIdx + 1);

        if (returnRaw) {
            return data.values; // Return original raw rows if requested
        }

        // Check if this sheet is wide statutory format vs flat format
        const hasStage = headers.some(h => h && h.toLowerCase().trim() === 'stage');
        const hasSubject = headers.some(h => h && h.toLowerCase().trim() === 'subject');
        
        const isWideStatutory = headers.some(h => h && (
            h.toLowerCase().startsWith('eyf') ||
            h.toLowerCase().startsWith('ks1') ||
            h.toLowerCase().startsWith('ks2') ||
            h.toLowerCase().includes('phonics') ||
            h.toLowerCase().includes('multiplication')
        ));

        if (!hasStage && !hasSubject && isWideStatutory && spreadsheetId === STATUTORY_SPREADSHEET_ID) {
            const flatData = [];
            
            // Robust UPN/Name index lookups
            let upnIdx = headers.findIndex(h => h && (
                h.toLowerCase().includes('upn') ||
                h.toLowerCase().includes('unique pupil') ||
                h.toLowerCase().includes('pupil id') ||
                h.toLowerCase().includes('student id') ||
                h.toLowerCase().includes('admission') ||
                h.toLowerCase().includes('id') ||
                h.toLowerCase().includes('code')
            ));
            
            let nameIdx = headers.findIndex(h => h && (
                h.toLowerCase().includes('name') ||
                h.toLowerCase().includes('student') ||
                h.toLowerCase().includes('pupil')
            ));

            // Fallbacks if one is missing
            if (upnIdx === -1) upnIdx = nameIdx !== -1 ? nameIdx : 0;
            if (nameIdx === -1) nameIdx = upnIdx;

            const dateIdx = headers.findIndex(h => h && (
                h.toLowerCase() === 'date' || 
                h.toLowerCase() === 'year' || 
                h.toLowerCase().includes('academic year')
            ));

            rows.forEach(row => {
                const upn = row[upnIdx];
                const name = nameIdx !== -1 ? row[nameIdx] : upn;
                if (!upn) return;

                const dateVal = dateIdx !== -1 ? row[dateIdx] : null;

                let phonicsMark = null;
                let phonicsOutcome = null;
                let phonicsStage = '1';
                let hasPhonics = false;
                const ksSubjects = {};

                headers.forEach((header, idx) => {
                    if (idx === upnIdx || idx === nameIdx || idx === dateIdx || !header || row[idx] === undefined || row[idx] === null || row[idx] === '') return;
                    const val = row[idx];
                    const cleanHeader = header.trim();
                    
                    // EYFS
                    const lowerHeader = cleanHeader.toLowerCase();
                    const isELG = lowerHeader.startsWith('eyf') ||
                        lowerHeader.includes('listening, attention') ||
                        lowerHeader.includes('speaking') ||
                        lowerHeader.includes('gross motor') ||
                        lowerHeader.includes('fine motor') ||
                        lowerHeader.includes('self-regulation') ||
                        lowerHeader.includes('self regulation') ||
                        lowerHeader.includes('managing self') ||
                        lowerHeader.includes('building relationships') ||
                        lowerHeader.includes('comprehension') ||
                        lowerHeader.includes('word reading') ||
                        lowerHeader.includes('numerical patterns') ||
                        (lowerHeader.includes('number') && !lowerHeader.includes('phone') && !lowerHeader.includes('mobile')) ||
                        (lowerHeader.includes('writing') && !lowerHeader.includes('handwriting') && !lowerHeader.includes('creative'));

                    if (isELG) {
                        const subjectName = cleanHeader.replace(/^eyfs?[:\s]*/i, '').trim();
                        flatData.push({
                            upn,
                            name,
                            stage: 'EYFS',
                            subject: subjectName,
                            result: val,
                            date: dateVal
                        });
                    }
                    // Phonics Y1/Y2
                    else if (cleanHeader.includes('Phonics')) {
                        hasPhonics = true;
                        if (cleanHeader.includes('Y2') || cleanHeader.includes('resit')) {
                            phonicsStage = '2';
                        }
                        
                        if (cleanHeader.toLowerCase().includes('mark') || cleanHeader.toLowerCase().includes('score')) {
                            phonicsMark = val;
                        } else if (cleanHeader.toLowerCase().includes('outcome') || cleanHeader.toLowerCase().includes('result') || cleanHeader.toLowerCase().includes('grade')) {
                            phonicsOutcome = val;
                        } else {
                            if (typeof val === 'string' && val.includes(',')) {
                                const parts = val.split(',').map(p => p.trim());
                                const numPart = parts.find(p => !isNaN(parseInt(p)));
                                const alphaPart = parts.find(p => isNaN(parseInt(p)));
                                phonicsOutcome = alphaPart || parts[parts.length - 1];
                                phonicsMark = numPart || parts[0];
                                phonicsStage = '2';
                            } else if (!isNaN(parseInt(val))) {
                                phonicsMark = val;
                            } else {
                                phonicsOutcome = val;
                            }
                        }
                    }
                    // MTC
                    else if (cleanHeader.includes('Multiplication')) {
                        flatData.push({
                            upn,
                            name,
                            stage: '4',
                            subject: 'Multiplication Check',
                            rawSubject: 'MTC',
                            mark: val,
                            result: val,
                            date: dateVal
                        });
                    }
                    // KS1 / KS2 Subjects
                    else if (cleanHeader.toUpperCase().startsWith('KS1') || cleanHeader.toUpperCase().startsWith('KS2')) {
                        const stage = cleanHeader.toUpperCase().startsWith('KS1') ? 'KS1' : 'KS2';
                        let subject = cleanHeader.replace(/^KS[12][:\s]*/i, '').trim();
                        
                        let baseSubject = subject
                            .replace(/\s*Outcome$/i, '')
                            .replace(/\s*Scaled\s*Score$/i, '')
                            .replace(/\s*Subject$/i, '')
                            .trim();

                        if (baseSubject.toLowerCase().includes('grammar') || baseSubject.toLowerCase().includes('gps')) {
                            baseSubject = 'Grammar, Punctuation and Spelling';
                        }

                        const subKey = `${stage}-${baseSubject.toLowerCase()}`;
                        if (!ksSubjects[subKey]) {
                            ksSubjects[subKey] = {
                                upn,
                                name,
                                stage,
                                subject: baseSubject,
                                result: '',
                                mark: '',
                                date: dateVal
                            };
                        }

                        const isScore = subject.toLowerCase().includes('score') || (!isNaN(parseInt(val)) && val !== '');
                        const isOutcome = subject.toLowerCase().includes('outcome') || isNaN(parseInt(val));

                        if (isScore) {
                            ksSubjects[subKey].mark = val;
                        }
                        if (isOutcome || !ksSubjects[subKey].result) {
                            ksSubjects[subKey].result = val;
                        }
                    }
                });

                // Push merged KS1/KS2 subjects
                Object.values(ksSubjects).forEach(subRecord => {
                    flatData.push(subRecord);
                });

                if (hasPhonics) {
                    flatData.push({
                        upn,
                        name,
                        stage: phonicsStage,
                        subject: 'Phonics',
                        result: phonicsOutcome || phonicsMark || '',
                        mark: phonicsMark || phonicsOutcome || '',
                        date: dateVal
                    });
                }
            });

            console.log(`Transposed statutory wide-to-flat records: ${flatData.length}`);
            return flatData;
        }

        // Convert array of arrays to array of objects with camelCase keys
        const parsedData = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                let value = row[index];

                // Create camelCase key from header
                let cleanHeader = header
                    .split(' ')
                    .map((word, i) => {
                        const cleaned = word.trim();
                        if (i === 0) {
                            return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
                        }
                        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                    })
                    .join('');

                if (cleanHeader.toLowerCase() === 'upn' || cleanHeader.toLowerCase() === 'upn1') {
                    cleanHeader = 'upn';
                }

                if (cleanHeader === 'score') {
                    value = Number(value) || 0;
                }

                obj[cleanHeader] = value;
            });

            // Special Override for Cultural Capital Sheet:
            if (spreadsheetId === CULTURAL_SPREADSHEET_ID && (range.includes('Clubs') || range.includes('Sheet1'))) {
                obj['tripsThisAcademicYear'] = row[8];
            }

            return obj;
        });

        console.log("Parsed data sample:", parsedData[0]);
        console.log("Total rows:", parsedData.length);
        return parsedData;
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        throw error;
    }
};

export const updateSheetData = async (accessToken, spreadsheetId, range, values) => {
    try {
        const encodedRange = encodeURIComponent(range);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?valueInputOption=USER_ENTERED`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                values: values
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Update failed: ${response.status} ${errorText}`);
        }

        return await response.json();
    } catch (err) {
        console.error("Update error:", err);
        throw err;
    }
};

// New Assessment Spreadsheet ID with term-based columns
export const NEW_ASSESSMENT_SPREADSHEET_ID = '1q5lITtOhorRbtDlQwLavS5Wl60n1mUmvsEYLpLPm6Jc';

const TERM_CODES = {
  'a1': 'Autumn Term 1',
  'a2': 'Autumn Term 2',
  'aut1': 'Autumn Term 1',
  'aut2': 'Autumn Term 2',
  'autumn1': 'Autumn Term 1',
  'autumn2': 'Autumn Term 2',
  'sp1': 'Spring Term 1',
  'sp2': 'Spring Term 2',
  'spr1': 'Spring Term 1',
  'spr2': 'Spring Term 2',
  'spring1': 'Spring Term 1',
  'spring2': 'Spring Term 2',
  'su1': 'Summer Term 1',
  'su2': 'Summer Term 2',
  'sum1': 'Summer Term 1',
  'sum2': 'Summer Term 2',
  'summer1': 'Summer Term 1',
  'summer2': 'Summer Term 2'
};

const SEASON_MAP = {
  'autumn': 'Autumn', 'aut': 'Autumn', 'a': 'Autumn',
  'spring': 'Spring', 'spr': 'Spring', 'sp': 'Spring',
  'summer': 'Summer', 'sum': 'Summer', 'su': 'Summer'
};

export const fetchAssessmentData = async (accessToken, spreadsheetId = NEW_ASSESSMENT_SPREADSHEET_ID) => {
    try {
        console.log("Fetching assessment data from new structure...", spreadsheetId);
        const range = 'Sheet1!A:CZ';
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}`;
        console.log("Fetch URL:", url);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Failed to fetch assessment data: ${response.status}`);

        const data = await response.json();
        const rows = data.values;
        if (!rows || rows.length < 2) return { current: [], historical: [] };

        const headers = rows[0];

        // --- 1. Identify Columns ---
        const currentColumns = [];
        const historicalColumns = [];
        let maxYear = 0;

        headers.forEach((header, index) => {
            const h = header.trim();
            if (!h) return;

            // Pattern 1: "Subject: Autumn Term 1" or "Subject - Autumn Term 1" or "Subject: Autumn 1"
            const pattern1 = /^(.+?)\s*[:\-]\s*(Autumn|Spring|Summer|Aut|Spr|Sum|A|Sp|Su)\s*(?:Term)?\s*([12])$/i;
            const match1 = h.match(pattern1);
            if (match1) {
                const subject = match1[1].replace(/\(CAMS\)/ig, '').trim();
                const seasonKey = match1[2].toLowerCase();
                const season = SEASON_MAP[seasonKey];
                const termNum = match1[3];
                currentColumns.push({
                    index,
                    header: h,
                    subject,
                    term: `${season} Term ${termNum}`
                });
                return;
            }

            // Pattern 2: "A1 - Subject" or "Autumn Term 1: Subject"
            const pattern2 = /^(Autumn|Spring|Summer|Aut|Spr|Sum|A|Sp|Su)\s*(?:Term)?\s*([12])\s*[:\-]\s*(.+)$/i;
            const match2 = h.match(pattern2);
            if (match2) {
                const seasonKey = match2[1].toLowerCase();
                const season = SEASON_MAP[seasonKey];
                const termNum = match2[2];
                const subject = match2[3].replace(/\(CAMS\)/ig, '').trim();
                currentColumns.push({
                    index,
                    header: h,
                    subject,
                    term: `${season} Term ${termNum}`
                });
                return;
            }

            // Pattern 3: "Subject: A1" or "Subject - Sp2"
            const pattern3 = /^(.+?)\s*[:\-]\s*(A1|A2|Aut1|Aut2|Sp1|Sp2|Spr1|Spr2|Su1|Su2|Sum1|Sum2)$/i;
            const match3 = h.match(pattern3);
            if (match3) {
                const subject = match3[1].replace(/\(CAMS\)/ig, '').trim();
                const code = match3[2].toLowerCase();
                currentColumns.push({
                    index,
                    header: h,
                    subject,
                    term: TERM_CODES[code]
                });
                return;
            }

            // Pattern 4: "A1: Subject" or "Sp2 - Subject"
            const pattern4 = /^(A1|A2|Aut1|Aut2|Sp1|Sp2|Spr1|Spr2|Su1|Su2|Sum1|Sum2)\s*[:\-]\s*(.+)$/i;
            const match4 = h.match(pattern4);
            if (match4) {
                const code = match4[1].toLowerCase();
                const subject = match4[2].replace(/\(CAMS\)/ig, '').trim();
                currentColumns.push({
                    index,
                    header: h,
                    subject,
                    term: TERM_CODES[code]
                });
                return;
            }

            // Pattern 5: Historical format "Subject YY/YY" (e.g. "Maths 24/25")
            const historicalPattern = /^(.+?)\s+(\d{2}\/\d{2})$/;
            const histMatch = h.match(historicalPattern);
            if (histMatch) {
                const subject = histMatch[1].replace(/\(CAMS\)/ig, '').trim();
                const yearString = histMatch[2];
                const endYear = parseInt(yearString.split('/')[1], 10);
                if (endYear > maxYear) maxYear = endYear;

                historicalColumns.push({
                    index,
                    header: h,
                    subject,
                    yearString,
                    academicYear: endYear
                });
            }
        });

        // --- 2. Identify Demographic Columns ---
        const demographicMapping = {
            name: ['Name', 'Student Name', 'Full Name', 'Preferred Name'],
            upn: ['UPN', 'Unique Pupil Number', 'Column 2'],
            yearGroup: ['Year Group(s) this academic year', 'Year Group', 'Year', 'Yr'],
            registrationForm: ['Registration form', 'Reg Form', 'Registration', 'Class'],
            sen: ['SEN', 'Special Educational Needs'],
            pupilPremium: ['Pupil Premium', 'PP'],
            eal: ['EAL', 'English as an Additional Language'],
            sex: ['Sex', 'Gender'],
            ethnicity: ['Ethnicity', 'Ethnic Group'],
            inYearAdmission: ['In Year Admission', 'IYA'],
            summerBorn: ['Summer born', 'Summerborn'],
            leavingDate: ['Leaving date', 'Date of leaving'],
            attendance: ['Attendance', 'Attendance %']
        };

        const demographicIndices = {};

        Object.entries(demographicMapping).forEach(([key, headerNames]) => {
            // First pass: try exact (case-insensitive) match
            for (const headerName of headerNames) {
                const index = headers.findIndex(h => h.trim().toLowerCase() === headerName.toLowerCase());
                if (index !== -1) {
                    demographicIndices[key] = index;
                    return;
                }
            }
            
            // Second pass: try partial match
            for (const headerName of headerNames) {
                const index = headers.findIndex(h => h.trim().toLowerCase().includes(headerName.toLowerCase()));
                if (index !== -1) {
                    demographicIndices[key] = index;
                    return;
                }
            }
        });

        // Fallbacks based on User Feedback ("Sex is in BI", "Attendance in BW", "EAL in BH")
        // BI = 60, BW = 74, BH = 59
        if (demographicIndices['sex'] === undefined) {
            console.log("Header 'Sex' not found, defaulting to column BI (60)");
            demographicIndices['sex'] = 60;
        }
        if (demographicIndices['attendance'] === undefined) {
            console.log("Header 'Attendance' not found, defaulting to column BW (74)");
            demographicIndices['attendance'] = 74;
        }
        if (demographicIndices['eal'] === undefined) {
            console.log("Header 'EAL...' not found, defaulting to column BH (59)");
            demographicIndices['eal'] = 59;
        }

        // --- 3. Parsing Helpers ---
        const getYearGroup = (regForm) => {
            if (!regForm) return null;
            const str = String(regForm).toLowerCase();
            if (str.includes('rec') || str.includes('r')) return 0;
            if (str.includes('nur') || str.includes('n')) return -1;
            const match = str.match(/\d+/);
            return match ? parseInt(match[0], 10) : null;
        };

        const getGradeLevel = (grade) => {
            const match = String(grade).match(/-(\d+)/);
            return match ? parseInt(match[1], 10) : null;
        };

        // --- 4. Transform Data ---
        const currentData = [];
        const historicalData = [];

        rows.slice(1).forEach(row => {
            // Base Student Data
            const studentBase = {};
            Object.entries(demographicIndices).forEach(([key, index]) => {
                let value = row[index] || '';

                // Normalize Yes/No fields
                // Now includes 'sen' as it is mapped to "SEN at any time..." which is Yes/No
                if (['pupilPremium', 'eal', 'inYearAdmission', 'sen', 'summerBorn'].includes(key)) {
                    value = (String(value).toLowerCase() === 'yes') ? 'Yes' : 'No';
                }

                // Normalize Sex
                if (key === 'sex') {
                    const v = String(value).toLowerCase().trim();
                    if (v === 'male' || v === 'm') value = 'M';
                    else if (v === 'female' || v === 'f') value = 'F';
                }

                studentBase[key] = value;
            });

            const currentStudentYear = getYearGroup(studentBase.registrationForm);

            // A. Process Current Data
            currentColumns.forEach(({ index, subject, term }) => {
                let grade = (row[index] || '').toString().trim().toUpperCase();
                if (grade) {
                    // Normalize PYB -> WBYG only for current data (user specific request from past?)
                    // Actually, user said "Treat these as WBYG" for historical. 
                    // Let's apply basic normalization to current as well for consistency if needed.
                    // Earlier code had: grade.replace(/PYB/i, 'WBYG');
                    if (grade === 'PYB') grade = 'WBYG';

                    currentData.push({
                        ...studentBase,
                        subject,
                        term,
                        score: grade
                    });
                }
            });

            // B. Process Historical Data
            historicalColumns.forEach(({ index, subject, academicYear, yearString }) => {
                let grade = (row[index] || '').toString().trim().toUpperCase();
                if (grade) {
                    // Logic Moved to scoreUtils.js
                    // We now preserve the raw historical grade (e.g., "EXS-3", "GDS-4")
                    // and compare it dynamically against the calculated historical year group.

                    historicalData.push({
                        ...studentBase,
                        subject, // e.g. "Maths"
                        academicYear: yearString, // e.g. "24/25" (This acts as the "year filter" value)
                        term: yearString,
                        score: grade,
                        isHistorical: true
                    });
                }
            });
        });

        console.log(`Fetched: ${currentData.length} current records, ${historicalData.length} historical records.`);
        return { current: currentData, historical: historicalData };

    } catch (error) {
        console.error("Error fetching assessment data:", error);
        throw error;
    }
};

export const fetchWellbeingData = async (accessToken, spreadsheetId = NEW_ASSESSMENT_SPREADSHEET_ID) => {
    try {
        console.log("Fetching wellbeing data...", spreadsheetId);
        const range = "'EH Survey'!A:CZ"; // Specified sheet name
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` },
            cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Failed to fetch wellbeing data: ${response.status}`);

        const data = await response.json();
        const rows = data.values;
        if (!rows || rows.length < 2) return [];

        const headers = rows[0];
        
        // Find index of vital columns
        const upnIndex = headers.findIndex(h => h.trim().toLowerCase() === 'column 2' || h.trim().toLowerCase() === 'upn');
        const timestampIndex = headers.findIndex(h => h.trim().toLowerCase() === 'timestamp');

        const scoreMap = {
            'all of the time': 5,
            'quite a lot of the time': 4,
            'some of the time': 3,
            'not much of the time': 2,
            'never': 1,
            '5': 5, '4': 4, '3': 3, '2': 2, '1': 1
        };

        const parsedData = rows.slice(1).map(row => {
            const entry = {
                timestamp: row[timestampIndex],
                upn: (row[upnIndex] || '').toString().trim(),
                responses: []
            };

            // Process all columns between Email and Column 1 (the name column)
            // Based on sample: Headers[2...16] are questions
            headers.forEach((header, i) => {
                if (i > 1 && i < upnIndex - 1) { // Skip timestamp/email and name/upn
                    const rawVal = (row[i] || '').toString().trim().toLowerCase();
                    const score = scoreMap[rawVal] || null;
                    
                    if (header && header.trim()) {
                        entry.responses.push({
                            question: header.trim(),
                            answer: row[i],
                            score: score
                        });
                    }
                }
            });

            // Calculate overall wellbeing score if enough data
            const validScores = entry.responses.filter(r => r.score !== null).map(r => r.score);
            if (validScores.length > 0) {
                entry.averageScore = (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2);
                entry.totalScore = validScores.reduce((a, b) => a + b, 0);
            }

            return entry;
        }).filter(e => e.upn); // Only keep entries with a UPN

        return parsedData;

    } catch (error) {
        console.error("Error fetching wellbeing data:", error);
        return [];
    }
};
