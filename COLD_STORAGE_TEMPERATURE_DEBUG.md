# Cold Storage Temperature Data Debugging Guide

This document provides troubleshooting steps for fixing the issue with temperature data not being fetched from the MongoDB database for the cold storage dashboard.

## Problem Statement

The cold storage dashboard was not properly fetching and displaying temperature data. The issue was that the user's name stored in localStorage was not available when the dashboard component tried to fetch temperature data.

## Root Causes Identified

1. **Missing User Name in LocalStorage**
   - The login process was not extracting and storing the user name from the JWT token
   - The dashboard was trying to use `localStorage.getItem('userName')` which was returning null

2. **Inconsistent Field Names in Database**
   - Some temperature data records use `coldStorageName`, others use `coldstoragename` (lowercase)
   - Some records have only `coldStorageId` but no name field

3. **No Fallback Mechanism**
   - When name lookup failed, the system didn't try alternative lookup methods

## Solutions Implemented

### 1. Fix JWT Token Extraction

Modified `App.tsx` to properly extract user information from JWT token during login:

```javascript
// Extract and store user name from JWT token
try {
  const payload = JSON.parse(atob(jwt.split('.')[1]));
  if (payload.name) {
    localStorage.setItem('userName', payload.name);
    console.log('Stored user name in localStorage:', payload.name);
  }
  
  // Store user ID as well
  if (payload.sub) {
    localStorage.setItem('userId', payload.sub);
    console.log('Stored user ID in localStorage:', payload.sub);
  }
} catch (e) {
  console.error('Failed to parse JWT token:', e);
}
```

### 2. Added Flexible Field Name Matching in Backend

Enhanced `cold-storage.service.ts` to handle multiple field name variants:

```javascript
// Case-sensitive exact field variants
orClauses.push({ coldStorageName });
orClauses.push({ coldstoragename: coldStorageName });

// Case-insensitive match on either field
const escaped = coldStorageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`^${escaped}$`, 'i');
orClauses.push({ coldStorageName: re });
orClauses.push({ coldstoragename: re });
```

### 3. Added Fallback to ID-Based Lookup

Updated `cold-storage.controller.ts` to try ID-based lookup when name-based lookup fails:

```javascript
// If no results found by name, and the requester is a coldstorage user, try matching by their userId
if ((!results || results.length === 0) && req?.user?.role === 'coldstorage') {
  this.logger.log(`No results by name. Falling back to coldStorageId lookup for user ${req.user.userId}`);
  return this.coldStorageService.getTemperatureDataByColdStorageIdAndDevice(req.user.userId, device);
}
```

### 4. Added Debug UI Panel

Added a debug panel to the DashboardColdStorage component to help with troubleshooting:

```javascript
{showDebugPanel && (
  <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1, border: '1px dashed #999' }}>
    <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', color: '#d32f2f' }}>
      Debug Panel: No userName found in localStorage
    </Typography>
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        label="Enter Cold Storage Name"
        value={manualColdStorageName}
        onChange={(e) => setManualColdStorageName(e.target.value)}
        size="small"
        variant="outlined"
        sx={{ flexGrow: 1 }}
      />
      <Button 
        variant="contained" 
        color="primary" 
        onClick={() => fetchTemperatureData(manualColdStorageName)}
        disabled={!manualColdStorageName}
      >
        Fetch Temperature Data
      </Button>
    </Box>
  </Box>
)}
```

## Additional Diagnostic Tools Created

1. **Debug Script for MongoDB Data Analysis**
   - `debug_temp_data_fields.js`: Lists all cold storage names in temperature data collection
   - `add_coldStorage_index.js`: Adds indexes to improve query performance

2. **Enhanced Logging**
   - Added detailed console logging throughout the temperature data fetch flow

## Verification Steps

1. **Check LocalStorage Contents**
   - After login, verify that `userName` and `userId` are set in localStorage
   - The debug panel displays current localStorage values

2. **Test Manual Name Entry**
   - Use the debug panel to manually enter a cold storage name and fetch data
   - Try both camelCase and lowercase name variants

3. **Verify Database Records**
   - Run the debug scripts to analyze database records:
   ```
   node debug_temp_data_fields.js
   node add_coldStorage_index.js
   ```

4. **Generate Test Data**
   - If no temperature data is available, generate test data:
   ```
   node generate_test_temp_data.js
   ```

## Future Improvements

1. **Standardize Field Names**: Ensure all data insertion scripts use consistent field names (`coldStorageName` is preferred)

2. **Add Database Migrations**: Create migration script to normalize existing data fields

3. **Error Handling**: Improve UX when no data is found with clearer user messages

4. **Caching Strategy**: Consider caching temperature data in Redux or Context to reduce API calls