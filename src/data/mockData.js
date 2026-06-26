// Column headers: Name, Subject, Term, Score, Year Group, Pupil Premium, SEN, EAL, Born in Summer, In Year Admission, Custom Group, Sex, Registration Form, Attendance

const NAMES = ["James", "Olivia", "Liam", "Emma", "Noah", "Ava", "William", "Sophia", "Mason", "Isabella"];
const SURANAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"];
const SUBJECTS = ["Math", "English", "Science", "History", "Geography"];
const TERMS = ["Autumn", "Spring", "Summer"];
const YEARS = ["Year 7", "Year 8", "Year 9", "Year 10", "Year 11"];

function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool(chance = 0.5) {
    return Math.random() < chance;
}

function randomScore(mean = 70, stdDev = 15) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const score = Math.round(z * stdDev + mean);
    return Math.max(0, Math.min(100, score));
}

export function generateMockData(count = 100) {
    const data = [];

    // Create students first
    const students = [];
    for (let i = 0; i < count; i++) {
        students.push({
            Name: `${randomItem(NAMES)} ${randomItem(SURANAMES)}`,
            YearGroup: randomItem(YEARS),
            PupilPremium: randomBool(0.3) ? "Yes" : "No",
            SEN: randomBool(0.15) ? "Yes" : "No",
            EAL: randomBool(0.1) ? "Yes" : "No",
            BornInSummer: randomBool(0.25) ? "Yes" : "No",
            InYearAdmission: randomBool(0.05) ? "Yes" : "No",
            Sex: randomBool() ? "M" : "F",
            RegistrationForm: `${randomItem(["7", "8", "9", "10", "11"])}${randomItem(["A", "B", "C", "D"])}`,
            Attendance: (90 + Math.random() * 10).toFixed(1) + "%", // 90-100%
            CustomGroup: randomBool(0.2) ? "Intervention A" : "",
        });
    }

    // Generate rows for each student * subject * term
    students.forEach(student => {
        SUBJECTS.forEach(subject => {
            TERMS.forEach(term => {
                // Add some variety to scores based on subject/student ability
                const ability = Math.random() * 20 - 10; // -10 to +10 legacy ability
                const score = randomScore(70 + ability, 10);

                data.push({
                    ...student,
                    Subject: subject,
                    Term: term,
                    Score: score
                });
            });
        });
    });

    return data;
}
