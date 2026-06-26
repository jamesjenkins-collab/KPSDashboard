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
const CULTURAL_SHEET_RANGE = 'Sheet1!A:Z'; // Extended to cover Leaving date and other columns
const TRIPS_SPREADSHEET_ID = '1DbiuwM19Z3VNFWK23enjtMrJfSrP7PLIHahZE8B-ZPA';
const SPORTS_TRIPS_SHEET_RANGE = 'Sports Trips!A:Z';
const API_KEY = "AIzaSyACtP5cKvNsZM3EMUv8jb1VZE1NGS08YaI";

export { SPREADSHEET_ID, SHEET_RANGE, EYFS_SPREADSHEET_ID, EYFS_SHEET_RANGE, CULTURAL_SPREADSHEET_ID, CULTURAL_SHEET_RANGE, TRIPS_SPREADSHEET_ID, SPORTS_TRIPS_SHEET_RANGE };

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
        const rows = data.values;

        if (!rows || rows.length === 0) {
            return [];
        }

        if (returnRaw) {
            return rows;
        }

        // Convert array of arrays to array of objects with camelCase keys
        const headers = rows[0];
        const parsedData = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                let value = row[index];

                // Create camelCase key from header
                // "Year Group" -> "yearGroup", "Pupil Premium" -> "pupilPremium", "Name" -> "name"
                const cleanHeader = header
                    .split(' ')
                    .map((word, i) => {
                        const cleaned = word.trim();
                        if (i === 0) {
                            // First word: lowercase first letter
                            return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
                        }
                        // Subsequent words: capitalize first letter
                        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                    })
                    .join('');

                // Parse Score as number
                if (cleanHeader === 'score') {
                    value = Number(value) || 0;
                }

                obj[cleanHeader] = value;
            });

            // Special Override for Cultural Capital Sheet:
            // User requested "Trips" to come from Column I (Index 8)
            if (spreadsheetId === CULTURAL_SPREADSHEET_ID) {
                obj['tripsThisAcademicYear'] = row[8];
            }

            return obj;
        });

        console.log("Parsed data sample:", parsedData[0]);
        console.log("Total rows:", parsedData.length);
        return parsedData;
    } catch (error) {
        console.error("Error fetching sheet data:", error);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        throw error;
    }
};

// New Assessment Spreadsheet ID with term-based columns
export const NEW_ASSESSMENT_SPREADSHEET_ID = '1q5lITtOhorRbtDlQwLavS5Wl60n1mUmvsEYLpLPm6Jc';

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

        // A. Current Data Pattern: "Subject: Term" (e.g., "Maths: Autumn Term 1")
        const currentPattern = /^(.+?):\s*(Autumn|Spring|Summer)\s+Term\s+([12])$/i;
        const currentColumns = [];

        // B. Historical Data Pattern: "Subject YY/YY" (e.g., "Maths 24/25")
        const historicalPattern = /^(.+?)\s+(\d{2}\/\d{2})$/;
        const historicalColumns = [];
        let maxYear = 0;

        headers.forEach((header, index) => {
            const h = header.trim();

            // Try Current Pattern
            const currentMatch = h.match(currentPattern);
            if (currentMatch) {
                let subject = currentMatch[1].trim();
                // Remove "(CAMS)" suffix or occurrence
                subject = subject.replace(/\(CAMS\)/ig, '').trim();

                const season = currentMatch[2];
                const termNumber = currentMatch[3];
                currentColumns.push({
                    index,
                    header: h,
                    subject,
                    term: `${season} Term ${termNumber}`
                });
                return; // Matched current, skip historical check
            }

            // Try Historical Pattern
            const histMatch = h.match(historicalPattern);
            if (histMatch) {
                let subject = histMatch[1].trim();
                // Remove "(CAMS)" suffix or occurrence
                subject = subject.replace(/\(CAMS\)/ig, '').trim();

                const yearString = histMatch[2]; // "24/25"
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
            'Name': 'name',
            'UPN': 'upn',
            'Registration form(s) this academic year': 'registrationForm',
            // User requested SEN filter/tags to use "SEN at any time this academic year?" (Col BE)
            'SEN at any time this academic year?': 'sen',
            'Pupil Premium Eligible at any time this academic year?': 'pupilPremium',
            // EAL check
            'EAL at any time this academic year?': 'eal',
            // Sex check: User said "Sex is in BI" which is handled by fallback if this fails, but let's be explicit
            'Sex': 'sex',
            'Ethnicity': 'ethnicity',
            'In Year Admission at any time this academic year?': 'inYearAdmission',
            // Summer Born isn't in the mapping list yet? Let's add it if we can find it.
            // Usually "Summer Born" or derived from DOB. If strict column:
            'Summer born': 'summerBorn',
            'Term of birth': 'termOfBirth', // fallback?

            'Year Group(s) this academic year': 'yearGroup',
            'Leaving date': 'leavingDate',
            'Attendance': 'attendance',
            'Attendance %': 'attendance'
        };
        const demographicIndices = {};
        Object.keys(demographicMapping).forEach(headerName => {
            // Use case-insensitive matching for headers
            const index = headers.findIndex(h => h.trim().toLowerCase() === headerName.toLowerCase());
            if (index !== -1) demographicIndices[demographicMapping[headerName]] = index;
        });

        // Fallbacks based on User Feedback ("Sex is in BI", "Attendance in BW")
        // BI = 60 (0-indexed), BW = 74 (0-indexed), BH = 59 (0-indexed)
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
