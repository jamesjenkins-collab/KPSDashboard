# Update Grade Transfer Menu

Since the Google Apps Script file is stored in your Google Sheet and not in this workspace, you need to manually update it.

Open your Google Spreadsheet (`1HFKfERqDVEE5atdGs9Kzcw49Sq3il0L7T-Jd_ItOzSU`), go to **Extensions > Apps Script**, and update your `onOpen` function and add a wrapper for A1.

## Code to Add

Find your `onOpen` function and update it (or replace it) with the following:

```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Grade Transfer')
      .addItem('Transfer A1 Grades', 'transferA1Grades') // New Item
      .addItem('Transfer A2 Grades', 'transferA2Grades') // Existing Item
      .addToUi();
}

/**
 * Wrapper function to transfer A1 grades.
 * Assumes you have a main generic function (e.g., runGradeMatcher or transferGrades)
 * that takes the term string as an argument.
 */
function transferA1Grades() {
  // Replace 'runGradeMatcher' with the actual name of your main function if different
  runGradeMatcher('A1'); 
}
```

If your main function has a different name (like `transferGrades`), please use that name instead of `runGradeMatcher`.
