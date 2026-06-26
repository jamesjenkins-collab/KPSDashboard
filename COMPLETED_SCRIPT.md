# Refactored Grade Transfer Script

It looks like the `transferGrades` function in your script was hardcoded to use `CONFIG.term` directly and didn't accept an argument. To fix the error and make it work for both A1 and A2, we need one small change to `transferGrades` and the new menu wrappers.

## Step 1: Replace your `transferGrades` function

Replace your existing `transferGrades` function with this version. It now accepts `termOverride` as an argument and updates the configuration before running.

```javascript
/**
 * Main function to execute the grade transfer
 * NOW ACCEPTS A TERM ARGUMENT (e.g., "A1", "A2")
 */
function transferGrades(termOverride) {
    // 1. Determine which term to use
    // If a term is passed, use it. Otherwise, use the one in CONFIG.
    const term = termOverride || CONFIG.term;
    
    // 2. Update the global CONFIG so helper functions (like findSubjectColumns) use the correct term
    CONFIG.term = term;

    Logger.log(`========== ${term} GRADE TRANSFER STARTED ==========`);

    const sourceSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!sourceSpreadsheet) {
      SpreadsheetApp.getUi().alert('Error: Could not access the active spreadsheet.');
      return;
    }
    Logger.log('Running from source spreadsheet: ' + sourceSpreadsheet.getName());

    // This calls findYearTabs with the valid sourceSpreadsheet
    const yearTabs = findYearTabs(sourceSpreadsheet); 

    // ... (The rest of your function remains exactly the same) ...
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
```

## Step 2: Update `onOpen` and Add Wrappers

Replace your `onOpen` function and add the wrapper functions at the bottom of your script (or replace the old ones).

```javascript
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
```
