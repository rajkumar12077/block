@echo off
echo Testing insurance claim workflow
cd %~dp0..\
node src/scripts/test-insurance-claim-workflow.js
pause