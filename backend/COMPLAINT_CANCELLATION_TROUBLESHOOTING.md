# Complaint Cancellation Troubleshooting

This document provides guidance on fixing the internal server error when canceling complaints.

## Summary of Changes Made

1. **Enhanced Error Handling**: We've improved error handling in both the backend and frontend to provide more detailed error messages.

2. **Database Update Method**: Changed from using `complaint.save()` to using `complaintModel.updateOne()` to bypass Mongoose validation issues.

3. **Added Extensive Logging**: Added detailed logging to help identify the exact source of errors.

4. **Created Testing Tools**: Added a script to test complaint cancellation directly against the database.

## Troubleshooting Steps

If you still encounter issues, try these steps:

1. **Check MongoDB Connection**: Ensure the MongoDB server is running and accessible.

2. **Verify Complaint IDs**: Ensure the complaint IDs being used in the frontend match what's in the database.

3. **Run the Test Script**: Use the provided test script to verify if the complaint can be cancelled:
   ```bash
   node src/scripts/test-cancel-complaint.js COMP-1759820510564-23xgw5wfp
   ```

4. **Check Server Logs**: Look for detailed error messages in the server logs.

5. **Try Direct Database Update**: If the API continues to fail, you can update the complaint status directly in the database:
   ```javascript
   db.complaints.updateOne(
     { complaintId: "COMP-1759820510564-23xgw5wfp" },
     { $set: { 
         status: "rejected", 
         cancellationDate: new Date().toISOString(), 
         cancellationReason: "Cancelled by seller" 
       }
     }
   )
   ```

6. **Clear Browser Cache**: Sometimes, cached API responses can cause issues. Clear your browser cache and try again.

7. **Check Network Requests**: Use your browser's developer tools to inspect the network requests and responses.

## Common Errors and Solutions

1. **"Complaint validation failed: status: `cancelled` is not a valid enum value"**
   - Solution: We're now using 'rejected' status as a workaround and tracking cancellation via the cancellationReason field.

2. **"Complaint not found"**
   - Check that the complaintId is correct and matches the database.
   - Verify that you're using complaintId and not _id in the API call.

3. **"Internal server error"**
   - Check the server logs for detailed error information.
   - Try restarting the server to ensure it's using the latest schema definitions.

## Future Improvements

For a more permanent solution, consider:

1. Running the migration script to properly update the database schema
2. Implementing a proper schema versioning system
3. Adding more robust error handling throughout the application