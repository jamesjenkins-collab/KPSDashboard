import { useState, useEffect, useMemo } from 'react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { LayoutDashboard } from 'lucide-react'

import { ScoreDistribution } from './components/charts/ScoreDistribution'
import { SubjectDeepDive } from './components/charts/SubjectDeepDive'
import { Login } from './components/Login'
import { fetchSheetData, fetchAssessmentData, fetchWellbeingData, SPREADSHEET_ID, SHEET_RANGE, EYFS_SPREADSHEET_ID, EYFS_SHEET_RANGE, CULTURAL_SPREADSHEET_ID, CULTURAL_SHEET_RANGE, TRIPS_SPREADSHEET_ID, SPORTS_TRIPS_SHEET_RANGE } from './lib/googleSheets'
import { calculatePercentageAtEXSPlus } from './lib/scoreUtils'
import { AIChat } from './components/AIChat'
import { EYFSView } from './components/views/EYFSView'
import { CulturalCapitalView } from './components/views/CulturalCapitalView'
import { AssessmentDashboardView } from './components/views/AssessmentDashboardView'
import { ProgressView } from './components/views/ProgressView'
import { SchoolContextView } from './components/views/SchoolContextView'
import { LandingPageView } from './components/views/LandingPageView'
import { CategoryLandingView } from './components/views/CategoryLandingView'
import { StudentProfilesListView } from './components/views/StudentProfilesListView'
import { StudentProfileView } from './components/views/StudentProfileView'
import { WellbeingView } from './components/views/WellbeingView'


const CLIENT_ID = "1065597664453-hdp8mvjr5n8mhgp08k79k9pe43f65l3v.apps.googleusercontent.com";

function Dashboard() {

  const [data, setData] = useState([]);
  const [eyfsData, setEyfsData] = useState([]);
  const [assessmentData, setAssessmentData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [culturalData, setCulturalData] = useState([]);
  const [wellbeingData, setWellbeingData] = useState([]);
  const [sportsTripsData, setSportsTripsData] = useState([]);
  const [tripsMetadata, setTripsMetadata] = useState({ upcoming: [], past: [] });
  const [loading, setLoading] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    yearGroup: [],
    registrationForm: [],
    subject: [],
    term: [],
    pupilPremium: [],
    sen: [],
    eal: [],
    summerBorn: [],
    inYearAdmission: [],
    sex: [],
    wellbeing: []
  });

  const [hideBLW, setHideBLW] = useState(false);
  const [hideStudentsBelowTarget, setHideStudentsBelowTarget] = useState(false);
  const [includeFormerStudents, setIncludeFormerStudents] = useState(false);

  // View state: 'home', 'dashboard', 'culturalCapital', or 'eyfs'
  const [currentView, setCurrentView] = useState('home');
  const [selectedStudentUpn, setSelectedStudentUpn] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle logout via navigation
  useEffect(() => {
    if (currentView === 'logout') {
      handleLogout();
    }
  }, [currentView]);

  const addLog = (msg) => {
    const time = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `${time} - ${msg}`]);
  };

  useEffect(() => {
    addLog("APP: Dashboard mounted");
  }, []);

  const handleLoginSuccess = (accessToken) => {
    addLog("LOGIN: Success received");
    console.log("Login Success - Access Token received");

    setUser({ loggedIn: true });
    setAccessToken(accessToken);

    addLog("DATA: Data fetching started");
    setLoading(true);

    // Fetch Cultural Capital & Trips
    Promise.all([
      fetchSheetData(accessToken, CULTURAL_SPREADSHEET_ID, CULTURAL_SHEET_RANGE),
      fetchSheetData(accessToken, TRIPS_SPREADSHEET_ID, 'Upcoming!A:E').catch(err => {
        console.warn("Upcoming trips sheet not found or inaccessible:", err);
        return [];
      }),
      fetchSheetData(accessToken, TRIPS_SPREADSHEET_ID, 'Previous!A:E').catch(err => {
        console.warn("Previous trips sheet not found or inaccessible:", err);
        return [];
      }),
      fetchSheetData(accessToken, CULTURAL_SPREADSHEET_ID, 'Sports Trips!A:AZ', true).catch(err => {
        console.warn("Sports trips sheet not found or inaccessible:", err);
        return [];
      })
    ]).then(([culturalRows, upcomingTrips, previousTrips, sportsTripsRaw]) => {


      addLog(`DATA: Fetched ${culturalRows.length} cultural rows`);
      addLog(`DATA: Fetched ${upcomingTrips.length} upcoming trips and ${previousTrips.length} previous trips`);
      addLog(`DATA: Fetched ${sportsTripsRaw ? sportsTripsRaw.length : 0} rows of sports trips data`);

      // 1. Calculate Cohort Sizes from the actual student data
      const cohortCounts = {};
      culturalRows.forEach(row => {
        const yg = row['yearGroup(s)ThisAcademicYear'];
        if (yg) {
          cohortCounts[yg] = (cohortCounts[yg] || 0) + 1;
        }
      });

      // 2. Process Trips and identify which ones to auto-attach
      const tripsToAttach = {}; // YearGroup -> [TripNames]

      const processTrips = (trips, type) => {
        return trips.map(trip => {
          // header mapping: Trip Date(s) -> tripDate(s), Trip Name -> tripName, Groups -> groups, Participants -> participants
          const tName = trip['tripName'];
          const tGroups = trip['groups']; // e.g. "Year 6"
          const tParticipants = parseInt(trip['participants']) || 0;

          // Check for rough match (±10%)
          // The user said "Groups - this is the year groups who attended". 
          // We can check if the group name contains a year group we have, or just rely on participants count if group matches?
          // Simplest: Check if 'groups' string matches a known year group key in cohortCounts
          // AND if participants is close to cohortCounts[group]

          // Split 'groups' by comma just in case "Year 5, Year 6"
          if (tGroups) {
            const statedGroups = tGroups.split(',').map(s => s.trim());
            statedGroups.forEach(groupName => {
              // Attempt to match groupName to our cohort keys (e.g. "Year 6" -> "Year 6")
              // Sometimes sheet has "Y6", "6", "Year 6". We might need normalization, but let's assume direct match first based on user desc.

              const targetSize = cohortCounts[groupName];
              if (targetSize) {
                const diff = Math.abs(tParticipants - targetSize);
                const variance = targetSize * 0.15; // 15% variance to be safe

                if (diff <= variance) {
                  // It's a match! Attach this trip to this year group
                  if (!tripsToAttach[groupName]) tripsToAttach[groupName] = [];
                  tripsToAttach[groupName].push(tName);
                }
              }
            });
          }
          return { ...trip, type };
        });
      };

      const processedUpcoming = processTrips(upcomingTrips, 'upcoming');
      const processedPrevious = processTrips(previousTrips, 'past');

      setTripsMetadata({
        upcoming: processedUpcoming,
        past: processedPrevious,
        all: [...processedUpcoming, ...processedPrevious]
      });

      const normalizedRows = culturalRows.map(row => {
        const yg = row['yearGroup(s)ThisAcademicYear'];
        let existingTrips = row['tripsThisAcademicYear'] || '';

        // Append attached trips - DEPRECATED via User Request
        // User confirmed "all trips attended" are in the manual column I.
        // So we do NOT auto-attach based on Year Group anymore.
        /*
        if (yg && tripsToAttach[yg]) {
          const autoTrips = tripsToAttach[yg].join(', ');
          if (existingTrips) {
            existingTrips = existingTrips + ', ' + autoTrips;
          } else {
            existingTrips = autoTrips;
          }
        }
        */

        return {
          ...row,
          yearGroup: yg,
          registrationForm: row['registrationForm(s)ThisAcademicYear'],
          pupilPremium: row['pupilPremiumEligibleAtAnyTimeThisAcademicYear?'] === 'Yes' ? 'Yes' : 'No',
          sen: row['sENAtAnyTimeThisAcademicYear?'] === 'Yes' ? 'K' : 'N',
          sex: row['sex'],
          leavingDate: row['leavingDate'],
          tripsThisAcademicYear: existingTrips // Updated with auto-attached trips
        };
      });

      setCulturalData(normalizedRows);

      // 3. Process Sports Trips (Updated User Request: 2 cols per trip: UPN, Name)
      if (sportsTripsRaw && sportsTripsRaw.length > 0) {
        const headers = sportsTripsRaw[0]; // Row 0 is headers
        const dataRows = sportsTripsRaw.slice(1);

        const processedSportsTrips = [];

        // Iterate columns in pairs
        for (let i = 0; i < headers.length; i += 2) {
          let tripName = headers[i];
          // Skip empty headers
          if (!tripName) continue;

          // Clean trip name (remove * and whitespace)
          tripName = tripName.replace(/\*/g, '').replace(/\t/g, ' ').trim();

          const participants = [];

          for (let r = 0; r < dataRows.length; r++) {
            const row = dataRows[r];
            if (!row) continue;

            // Check if column index exists in this row
            const upn = row[i];
            const name = row[i + 1];

            if (upn && upn.toString().trim().length > 0) {
              participants.push({
                upn: upn.toString().trim(),
                name: name ? name.toString().trim() : 'Unknown Name'
              });
            }
          }

          if (participants.length > 0) {
            processedSportsTrips.push({
              tripName: tripName,
              participants
            });
          }
        }


        setSportsTripsData(processedSportsTrips);
      } else {
        addLog("DATA: No raw sports trips data returned from sheet.");
      }

      setLoading(false);
    })
      .catch(err => {
        addLog(`ERROR: ${err.message}`);
        console.error(err);
        setCulturalData([]);
        setLoading(false);
      });
    // Fetch Assessment Data (now returns { current, historical })
    fetchAssessmentData(accessToken)
      .then(({ current, historical }) => {
        addLog(`DATA: Fetched ${current.length} current records and ${historical.length} historical records`);
        setAssessmentData(current);
        setHistoricalData(historical);
      })
      .catch(err => {
        addLog(`ERROR Assessment: ${err.message}`);
        console.error("Assessment Fetch Error", err);
      });

    // Fetch Wellbeing Data
    fetchWellbeingData(accessToken)
      .then(wbData => {
        addLog(`DATA: Fetched ${wbData.length} wellbeing survey responses`);
        setWellbeingData(wbData);
      })
      .catch(err => {
        addLog(`ERROR Wellbeing: ${err.message}`);
        console.error("Wellbeing Fetch Error", err);
      });
  };

  const activeData = useMemo(() => {
    if (currentView === 'home' || currentView.startsWith('cat_')) return assessmentData;
    if (currentView === 'studentProfiles' || currentView === 'studentProfile') return assessmentData;
    if (currentView === 'culturalCapital') return culturalData;
    if (currentView === 'dashboard' || currentView === 'progress' || currentView === 'schoolContext' || currentView === 'subjectAnalysis' || currentView === 'wellbeing') return assessmentData;
    if (currentView === 'eyfs') return eyfsData;
    return data;
  }, [currentView, data, eyfsData, culturalData, assessmentData]);

  // Derived unique list of students with their demographics and wellbeing
  const allStudents = useMemo(() => {
    const studentMap = new Map();
    assessmentData.forEach(record => {
      if (record.upn && !studentMap.has(record.upn)) {
        studentMap.set(record.upn, {
          upn: record.upn,
          name: record.name,
          yearGroup: record.yearGroup,
          registrationForm: record.registrationForm,
          sex: record.sex,
          pupilPremium: record.pupilPremium,
          sen: record.sen,
          eal: record.eal,
          summerBorn: record.summerBorn,
          inYearAdmission: record.inYearAdmission,
          leavingDate: record.leavingDate
        });
      }
    });

    // Get latest wellbeing score per student
    const wbMap = new Map();
    [...wellbeingData].reverse().forEach(wb => {
      if (wb.upn) wbMap.set(wb.upn, parseFloat(wb.averageScore));
    });

    return Array.from(studentMap.values()).map(s => {
      const score = wbMap.get(s.upn);
      let bucket = null;
      if (score !== undefined && !isNaN(score)) {
        const floor = Math.floor(score * 2) / 2;
        bucket = `${floor.toFixed(1)} - ${(floor + 0.5).toFixed(1)}`;
      }
      return { ...s, latestWellbeingScore: score, wellbeingBucket: bucket };
    });
  }, [assessmentData, wellbeingData]);

  // Quick lookup map for filtering efficiency
  const studentWellbeingMap = useMemo(() => {
    const map = new Map();
    allStudents.forEach(s => {
      if (s.wellbeingBucket) map.set(s.upn, s.wellbeingBucket);
    });
    return map;
  }, [allStudents]);

  const availableFilters = useMemo(() => {
    if (!activeData || !activeData.length) return { yearGroups: [], registrationForms: {}, subjects: [], terms: [], sex: [], wellbeing: [] };

    // Extract year groups from registrationForm patterns (e.g., "y1-ClassA" → "Year 1")
    const yearGroupMap = {}; // "Year 1" -> ["y1-ClassA", "y1-ClassB"]
    const allRegistrationForms = [...new Set(activeData.map(d => d.registrationForm).filter(Boolean))];

    allRegistrationForms.forEach(form => {
      const lowerForm = form.toLowerCase();
      let yearGroupName = null;

      // Match pattern: "6B", "Year 6", "y6b", "6", etc.
      const numberMatch = form.match(/\d+/);
      if (numberMatch) {
          yearGroupName = `Year ${numberMatch[0]}`;
      } else if (lowerForm.includes('rec') || lowerForm.startsWith('r')) {
          yearGroupName = "Year 0";
      } else if (lowerForm.includes('nur') || lowerForm.startsWith('n')) {
          yearGroupName = "Nursery";
      }

      if (yearGroupName) {
        if (!yearGroupMap[yearGroupName]) {
          yearGroupMap[yearGroupName] = [];
        }
        if (!yearGroupMap[yearGroupName].includes(form)) {
            yearGroupMap[yearGroupName].push(form);
        }
      }
    });

    // Sort year groups properly (Nursery, Year 0, Year 1, ...)
    const yearGroups = Object.keys(yearGroupMap).sort((a, b) => {
      const getOrder = (name) => {
          if (name === 'Nursery') return -1;
          const num = name.match(/\d+/);
          return num ? parseInt(num[0]) : 99;
      };
      return getOrder(a) - getOrder(b);
    });

    const registrationForms = {};
    yearGroups.forEach(year => {
      registrationForms[year] = yearGroupMap[year].sort();
    });

    const subjects = [...new Set(activeData.map(d => d.subject).filter(Boolean))].sort();

    // Ensure all standard terms are available even if data is missing
    const standardTerms = [
      'Autumn Term 1', 'Autumn Term 2',
      'Spring Term 1', 'Spring Term 2',
      'Summer Term 1', 'Summer Term 2'
    ];
    const activeDataTerms = activeData.map(d => d.term).filter(Boolean);
    const terms = [...new Set([...standardTerms, ...activeDataTerms])].sort();

    const studentWellbeingBuckets = [...new Set(allStudents.map(s => s.wellbeingBucket).filter(Boolean))].sort();

    return {
      yearGroups,
      registrationForms,
      subjects,
      terms,
      sex: [...new Set(activeData.map(d => d.sex).filter(Boolean))].sort(),
      wellbeing: studentWellbeingBuckets
    };
  }, [activeData, allStudents]);


  const filteredData = useMemo(() => {
    if (!activeData || !activeData.length) return [];

    return activeData.filter(student => {
      // Filter out former students unless includeFormerStudents is true OR a term is selected
      // If a specific term is selected, we want to see all students who have data for that term (historical context),
      // so we override the "Current Roll" filter.
      // If no term is selected (Overview), we respect the checkbox to allow filtering for "Current Cohort".
      const isTermSelected = filters.term.length > 0;
      const shouldInclude = includeFormerStudents || isTermSelected;

      // Student has left if leavingDate exists and is not empty
      const hasLeft = student.leavingDate && student.leavingDate.trim() !== '';

      if (!shouldInclude && hasLeft) return false;

      // Year Group filtering: Check if student's registrationForm matches selected year groups
      if (filters.yearGroup.length > 0) {
        const studentForm = student.registrationForm;
        const matchesYearGroup = filters.yearGroup.some(yearGroup => {
          const yearMatch = yearGroup.match(/Year (\d+)/i);
          if (yearMatch && studentForm) {
            const yearNum = yearMatch[1];
            // Extract number from student form (e.g., "6B" -> "6", "y5a" -> "5")
            const formYearMatch = studentForm.match(/\d+/);
            if (formYearMatch && formYearMatch[0] === yearNum) return true;
            
            // Fallback for Reception/Nursery if they don't have numbers
            if (yearNum === "0" && (studentForm.toLowerCase().includes('rec') || studentForm.toLowerCase().startsWith('r'))) return true;
          }
          return false;
        });
        if (!matchesYearGroup) return false;
      }

      // Registration Form (specific class) filtering
      if (filters.registrationForm.length > 0 && !filters.registrationForm.includes(student.registrationForm)) return false;

      if (filters.sex.length > 0 && !filters.sex.includes(student.sex)) return false;
      if (filters.pupilPremium.length > 0 && !filters.pupilPremium.includes(student.pupilPremium)) return false;
      if (filters.sen.length > 0 && !filters.sen.includes(student.sen)) return false;
      if (filters.eal.length > 0 && !filters.eal.includes(student.eal)) return false;
      if (filters.summerBorn.length > 0 && !filters.summerBorn.includes(student.summerBorn)) return false;
      if (filters.inYearAdmission.length > 0 && !filters.inYearAdmission.includes(student.inYearAdmission)) return false;

      // Subject Filter: Only applicable for assessment views
      if (filters.subject.length > 0 && !filters.subject.includes(student.subject)) return false;

      // Term Filter: Only applicable for assessment views
      if (filters.term.length > 0 && !filters.term.includes(student.term)) return false;

      // Wellbeing Bucket Filter (Global)
      if (filters.wellbeing?.length > 0) {
        const bucket = studentWellbeingMap.get(student.upn);
        if (!bucket || !filters.wellbeing.includes(bucket)) return false;
      }

      return true;
    });
  }, [activeData, filters, includeFormerStudents, studentWellbeingMap]);

  // Wellbeing filtering logic: Match surveys to filtered students via UPN
  const displayedWellbeingData = useMemo(() => {
    const hasDemographicFilters = filters.yearGroup.length > 0 || 
                                   filters.registrationForm.length > 0 || 
                                   filters.sex.length > 0 || 
                                   filters.pupilPremium.length > 0 || 
                                   filters.sen.length > 0 || 
                                   filters.eal.length > 0;

    if (!hasDemographicFilters) return wellbeingData;

    // Filter the master student list based on demographics
    const matchingUpns = new Set(
        allStudents.filter(student => {
            // 1. Year Group
            if (filters.yearGroup.length > 0) {
                const sForm = student.registrationForm;
                const matchesYG = filters.yearGroup.some(yg => {
                    const match = yg.match(/\d+/);
                    if (match && sForm) {
                        const num = match[0];
                        const sNum = sForm.match(/\d+/);
                        if (sNum && sNum[0] === num) return true;
                        if (num === "0" && (sForm.toLowerCase().includes('rec') || sForm.toLowerCase().startsWith('r'))) return true;
                    }
                    return false;
                });
                if (!matchesYG) return false;
            }

            // 2. Registration Form
            if (filters.registrationForm.length > 0 && !filters.registrationForm.includes(student.registrationForm)) {
                return false;
            }

            // 3. Other demographics
            if (filters.sex.length > 0 && !filters.sex.includes(student.sex)) return false;
            if (filters.pupilPremium.length > 0 && !filters.pupilPremium.includes(student.pupilPremium)) return false;
            if (filters.sen.length > 0 && !filters.sen.includes(student.sen)) return false;
            if (filters.eal && filters.eal.length > 0 && !filters.eal.includes(student.eal)) return false;
            
            // Wellbeing Bucket Filter
            if (filters.wellbeing?.length > 0) {
              const bucket = studentWellbeingMap.get(student.upn);
              if (!bucket || !filters.wellbeing.includes(bucket)) return false;
            }

            return true;
        }).map(s => s.upn)
    );

    return wellbeingData.filter(entry => matchingUpns.has(entry.upn));
  }, [wellbeingData, allStudents, filters, studentWellbeingMap]);

  const handleStudentClick = (upn) => {
    setSelectedStudentUpn(upn);
    setCurrentView('studentProfile');
  };

  const selectedStudent = useMemo(() => {
    if (!selectedStudentUpn) return null;
    
    // Find base student info from assessment data
    const student = assessmentData.find(s => {
      const keys = Object.keys(s);
      const upnKey = keys.find(k => k.toLowerCase() === 'upn');
      return upnKey && String(s[upnKey]).trim() === String(selectedStudentUpn).trim();
    });

    if (!student) return null;

    // Find cultural capital data for this student
    const cultural = culturalData.find(c => {
      const keys = Object.keys(c);
      const upnKey = keys.find(k => k.toLowerCase() === 'upn');
      return upnKey && String(c[upnKey]).trim() === String(selectedStudentUpn).trim();
    });

    // Find wellbeing data for this student
    const wellbeingEntries = wellbeingData.filter(w => String(w.upn).trim() === String(selectedStudentUpn).trim());

    return { ...student, ...cultural, wellbeing: wellbeingEntries };
  }, [selectedStudentUpn, assessmentData, culturalData, wellbeingData]);

  const handleFilterChange = (category, values) => {
    setFilters(prev => ({ ...prev, [category]: values }));
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setData([]);
    setEyfsData([]);
    setAssessmentData([]);
    setCulturalData([]);
    setWellbeingData([]);
    setFilters({
      yearGroup: [],
      registrationForm: [],
      subject: [],
      term: [],
      pupilPremium: [],
      sen: [],
      eal: [],
      summerBorn: [],
      inYearAdmission: [],
      sex: [],
      wellbeing: []
    });
    setCurrentView('dashboard');
    addLog("LOGOUT: User signed out");
  };

  if (!user) {
    return <Login onSuccess={handleLoginSuccess} />;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      filters={filters}
      onFilterChange={handleFilterChange}
      availableFilters={availableFilters}
      currentView={currentView}
      onNavigate={setCurrentView}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 lg:p-8">

          {/* Hub Navigation (Category Landing Pages) */}
          {currentView.startsWith('cat_') && (
            <CategoryLandingView
              categoryId={currentView}
              onNavigate={setCurrentView}
              onBack={() => setCurrentView('home')}
            />
          )}

          {/* View: Home */}
          {currentView === 'home' && (
            <LandingPageView
              onNavigate={setCurrentView}
              stats={{
                studentCount: assessmentData.length > 0 ? [...new Set(assessmentData.map(s => s.upn))].length : 0,
                culturalCount: culturalData.length
              }}
            />
          )}

          {/* View: Dashboard (Assessment) */}
          {currentView === 'dashboard' && (
            <AssessmentDashboardView data={filteredData} historicalData={historicalData} />
          )}

          {/* View: Pupil Profiles List */}
          {currentView === 'studentProfiles' && (
            <StudentProfilesListView data={assessmentData} onStudentClick={handleStudentClick} />
          )}

          {/* View: Student Profile */}
          {currentView === 'studentProfile' && (
            <StudentProfileView
              student={selectedStudent}
              attemptedUpn={selectedStudentUpn}
              onBack={() => setCurrentView('studentProfiles')}
            />
          )}

          {/* View: Progress */}
          {currentView === 'progress' && (
            <ProgressView currentData={filteredData} historicalData={historicalData} />
          )}

          {/* View: EYFS - COMING SOON */}
          {currentView === 'eyfs' && (
            <div className="max-w-7xl mx-auto space-y-6 flex flex-col items-center justify-center min-h-[40vh] text-center">
              <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
                <div className="w-20 h-20 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Baby className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">EYFS Tracker Coming Soon</h2>
                <p className="text-gray-500 text-lg leading-relaxed">
                  The Early Years Foundation Stage (EYFS) tracker is currently under development.
                  Please check back later for updates.
                </p>
              </div>
            </div>
          )}

          {/* View: Cultural Capital */}
          {currentView === 'culturalCapital' && (
            <CulturalCapitalView
              data={filteredData}
              tripsMetadata={tripsMetadata}
              sportsTrips={sportsTripsData} // Pass the parsed sports trips
              fullContextData={activeData} // Pass full data to allow matching in the view
            />
          )}

          {/* View: School Context */}
          {currentView === 'schoolContext' && (
            <SchoolContextView data={filteredData} />
          )}

          {/* View: Subject Analysis */}
          {currentView === 'subjectAnalysis' && (
            <SubjectDeepDive
              data={filteredData}
              fullData={activeData}
              allSubjects={availableFilters.subjects}
              filters={filters}
            />
          )}

          {/* View: Wellbeing */}
          {currentView === 'wellbeing' && (
            <WellbeingView 
              data={displayedWellbeingData} 
              studentData={assessmentData}
            />
          )}

        </main>
      </div>
      <AIChat data={filteredData} />
    </DashboardLayout>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <Dashboard />
    </GoogleOAuthProvider>
  );
}

export default App
