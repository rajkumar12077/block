# AgriBlock Connection Troubleshooting Guide

## Common Connection Errors

If you're seeing connection errors like these:
```
6:16:27 pm [vite] http proxy error: /user/balance
AggregateError [ECONNREFUSED]
```

This means the frontend application cannot connect to the backend server. Here's how to fix it:

## Quick Fix Steps

1. **Make sure the backend server is running**
   - Navigate to the backend directory: `cd e:\AGRIBLOCK\block\backend`
   - Start the backend server: `npm start`
   - Wait until you see a message like: `Application is running on: http://localhost:3000`

2. **Check if the backend server has errors**
   - If there are any error messages when starting the backend server, you'll need to fix those first
   - Common errors include:
     - MongoDB connection issues
     - Port conflicts (another application using port 3000)
     - TypeScript compilation errors

3. **Use the helper scripts we've created**
   - Run `e:\AGRIBLOCK\block\start_backend.bat` to start the backend server
   - Run `e:\AGRIBLOCK\block\start_frontend.bat` to start the frontend server
   - Run `node e:\AGRIBLOCK\block\check_backend.js` to check if the backend server is running properly

## Detailed Troubleshooting

### 1. Check if port 3000 is already in use

If another application is using port 3000, the backend server won't be able to start. You can:

```powershell
# Find processes using port 3000
netstat -ano | findstr :3000

# If you find a process using port 3000, kill it (replace PID with the actual process ID)
taskkill /F /PID <PID>
```

### 2. Verify MongoDB connection

The backend requires a MongoDB connection. Check if the connection string is valid in:
`e:\AGRIBLOCK\block\backend\src\app.module.ts`

### 3. Clear and rebuild the backend

Sometimes, compilation errors or stale build files can cause issues:

```
cd e:\AGRIBLOCK\block\backend
rm -r dist/
npm run build
npm start
```

### 4. Checking MongoDB Connection

If you're having issues with MongoDB, you can verify the connection using MongoDB Compass with the connection string:
`mongodb+srv://raj:123@blockchain.v6ctmwb.mongodb.net/blockchain`

### 5. API endpoint verification

The frontend tries to access these endpoints:
- `/api/user/balance` (proxied to `http://localhost:3000/user/balance`)
- `/api/accounts/transactions` (proxied to `http://localhost:3000/accounts/transactions`)

Make sure these endpoints are working by checking them directly:
- `http://localhost:3000/user/balance` (with an Authorization header)
- `http://localhost:3000/accounts/transactions` (with an Authorization header)

## Still Having Issues?

If you're still experiencing connection problems after trying these steps:

1. Check if there's a network firewall blocking connections
2. Verify that your Vite proxy configuration is correct in `e:\AGRIBLOCK\block\frontend\vite.config.ts`
3. Try restarting both the frontend and backend servers
4. Check the browser console for additional error details