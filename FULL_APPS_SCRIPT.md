# Full Google Apps Script Code

Here is the complete code.

**IMPORTANT:** I do not have your `CONFIG` object (the part at the top with `spreadsheetId`, `subjectMapping`, etc.).
**You must keep your existing `CONFIG` at the very top of the file.**

Replace everything **below** your `CONFIG` variable with this code:

```javascript
/* 
 * ==========================================
 * PASTE THIS BELOW YOUR 'const CONFIG = { ... }'
 * ==========================================
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Grade Transfer')
      .addItem('Transfer A1 Grades', 'transferA1Grades')
      .addItem('Transfer A2 Grades', 'transferA2Grades')
      .addToUi();
}

/**
 * Wrapper for A1
 */
function transferA1Grades() {
  transferGrades('A1');
}

/**
 * Wrapper for A2
 */
function transferA2Grades() {
  transferGrades('A2');
}

/**
 * Main function to execute the grade transfer
 * NOW ACCEPTS A TERM ARGUMENT (e.g., "A1", "A2")
 */
function transferGrades(termOverride) {
    // 1. Determine which term to use
    // If a term is passed, use it. Otherwise, use the one in CONFIG.
    const term = termOverride || CONFIG.term;
    
    // 2. Update the global CONFIG so helper functions use the correct term
    CONFIG.term = term;

    Logger.log(`========== ${term} GRADE TRANSFER STARTED ==========`);

    const sourceSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!sourceSpreadsheet) {
      SpreadsheetApp.getUi().alert('Error: Could not access the active spreadsheet.');
      return;
    }
    Logger.log('Running from source spreadsheet: ' + sourceSpreadsheet.getName());

    const yearTabs = findYearTabs(sourceSpreadsheet);
    Logger.log(`Found ${yearTabs.length} year group tabs: ${yearTabs.map(t => t.name).join(', ')}`);

    if (yearTabs.length === 0) {
        SpreadsheetApp.getUi().alert(
            'No Year Tabs Found',
            'Could not find any tabs starting with y1, y2, y3, y4, y5, or y6.\n\nPlease check your tab names.',
            SpreadsheetApp.getUi().ButtonSet.OK
        );
        return;
    }

    let destSpreadsheet;
    try {
        Logger.log('Opening destination spreadsheet...');
        destSpreadsheet = SpreadsheetApp.openById(CONFIG.destSheetId);
        Logger.log('Destination spreadsheet opened: ' + destSpreadsheet.getName());
    } catch (error) {
        const errorMsg = 'Cannot access destination spreadsheet.\n\nSheet ID: ' + CONFIG.destSheetId + '\n\nError: ' + error.message;
        Logger.log('ERROR: ' + errorMsg);
        SpreadsheetApp.getUi().alert('Access Error', errorMsg, SpreadsheetApp.getUi().ButtonSet.OK);
        return;
    }

    let totalTransfers = 0;
    let totalErrors = 0;
    const errors = [];

    yearTabs.forEach(yearTab => {
        Logger.log(`\n--- Processing ${yearTab.name} (${yearTab.prefix}) ---`);

        try {
            const result = processYearTab(yearTab.sheet, destSpreadsheet);
            totalTransfers += result.transfers;
            totalErrors += result.errors.length;
            errors.push(...result.errors);

            Logger.log(`${yearTab.name}: ${result.transfers} grades transferred, ${result.errors.length} errors`);

        } catch (error) {
            Logger.log(`ERROR processing ${yearTab.name}: ${error.message}`);
            totalErrors++;
            errors.push(`${yearTab.name}: ${error.message}`);
        }
    });

    Logger.log('\n========== TRANSFER COMPLETE ==========');
    Logger.log(`Total grades transferred: ${totalTransfers}`);
    Logger.log(`Total errors: ${totalErrors}`);

    if (errors.length > 0) {
        Logger.log('\n--- ERRORS ---');
        errors.forEach(err => Logger.log(err));
    }

    SpreadsheetApp.getUi().alert(
        `${term} Grade Transfer Complete`,
        `Transferred: ${totalTransfers} grades\nErrors: ${totalErrors}\n\nCheck the logs for details.`,
        SpreadsheetApp.getUi().ButtonSet.OK
    );
}

function findYearTabs(spreadsheet) {
    const allSheets = spreadsheet.getSheets();
    const yearTabs = [];

    allSheets.forEach(sheet => {
        const sheetName = sheet.getName();

        CONFIG.yearPrefixes.forEach(prefix => {
            if (sheetName.toLowerCase().startsWith(prefix.toLowerCase())) {
                yearTabs.push({
                    name: sheetName,
                    prefix: prefix,
                    sheet: sheet
                });
            }
        });
    });

    return yearTabs;
}

/**
 * Process a single year tab
 */
function processYearTab(sourceSheet, destSpreadsheet) {
    const result = { transfers: 0, errors: [] };

    const data = sourceSheet.getDataRange().getValues();
    if (data.length < 2) {
        result.errors.push(`${sourceSheet.getName()}: No data found`);
        return result;
    }

    const headers = data[0];
    const subjectColumns = findSubjectColumns(headers);
    Logger.log(`Found ${subjectColumns.length} ${CONFIG.term} subject columns: ${subjectColumns.map(c => c.subject).join(', ')}`);

    subjectColumns.forEach(subjectCol => {
        try {
            const transferred = transferSubjectGrades(
                data,
                subjectCol,
                destSpreadsheet,
                sourceSheet.getName()
            );
            result.transfers += transferred;
        } catch (error) {
            result.errors.push(`${sourceSheet.getName()} - ${subjectCol.subject}: ${error.message}`);
        }
    });

    return result;
}

/**
 * Find all columns with the configured term prefix (e.g., "A2 -")
 * Handles varying whitespace: "A2 - Culture", "A2  - Culture", etc.
 */
function findSubjectColumns(headers) {
    const subjectColumns = [];

    // Create regex pattern based on configured term
    // Example: /^A2\s*-\s*(.+)$/i for A2
    const termPattern = new RegExp(`^${CONFIG.term}\\s*-\\s*(.+)$`, 'i');

    headers.forEach((header, colIndex) => {
        const headerStr = String(header).trim();

        const match = headerStr.match(termPattern);
        if (match) {
            const subjectName = match[1].trim();
            const destTab = findDestinationTab(subjectName);

            if (destTab) {
                subjectColumns.push({
                    colIndex: colIndex,
                    header: headerStr,
                    subject: subjectName,
                    destTab: destTab
                });
                Logger.log(`  ✓ "${headerStr}" -> "${destTab}"`);
            } else {
                Logger.log(`  ✗ No destination tab found for "${subjectName}" (from header: "${headerStr}")`);
            }
        }
    });

    return subjectColumns;
}

/**
 * Find the destination tab name for a subject
 */
function findDestinationTab(subjectName) {
    // Try exact match first
    if (CONFIG.subjectMapping[subjectName]) {
        return CONFIG.subjectMapping[subjectName];
    }

    // Try case-insensitive partial match
    const subjectLower = subjectName.toLowerCase();
    for (const [key, value] of Object.entries(CONFIG.subjectMapping)) {
        if (subjectLower.includes(key.toLowerCase()) || key.toLowerCase().includes(subjectLower)) {
            return value;
        }
    }

    return null;
}

/**
 * Transfer grades for a specific subject
 */
function transferSubjectGrades(sourceData, subjectCol, destSpreadsheet, yearTab) {
    const destSheet = destSpreadsheet.getSheetByName(subjectCol.destTab);
    if (!destSheet) {
        Logger.log(`WARNING: Destination tab "${subjectCol.destTab}" not found`);
        return 0;
    }

    const destData = destSheet.getDataRange().getValues();
    if (destData.length < 2) {
        Logger.log(`WARNING: No data in destination tab "${subjectCol.destTab}"`);
        return 0;
    }

    // Build UPN lookup map for destination (UPN -> row index)
    const destUpnMap = {};
    for (let i = 1; i < destData.length; i++) {
        const upn = String(destData[i][CONFIG.destUpnColumn]).trim();
        if (upn) {
            destUpnMap[upn] = i + 1; // +1 for 1-indexed row numbers
        }
    }

    let transferCount = 0;

    // Process each student in source data
    for (let i = 1; i < sourceData.length; i++) {
        const upn = String(sourceData[i][CONFIG.sourceUpnColumn]).trim();
        const grade = sourceData[i][subjectCol.colIndex];

        if (!upn) continue; // Skip empty UPNs

        // Find matching row in destination
        const destRow = destUpnMap[upn];
        if (destRow) {
            // Only transfer if there's a grade value
            if (grade !== null && grade !== undefined && grade !== '') {
                // Write grade to Column H
                destSheet.getRange(destRow, CONFIG.destGradeColumn + 1).setValue(grade);
                transferCount++;
            }
        }
    }

    Logger.log(`  ${subjectCol.subject} -> ${subjectCol.destTab}: ${transferCount} grades transferred`);

    return transferCount;
}
```
