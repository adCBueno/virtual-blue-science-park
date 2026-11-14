@echo off
REM ============================================================
REM  Publishes the Virtual Science Park image to Docker Hub
REM    adcbueno1/virtual-science-park:<version>  and  :latest
REM  Usage: double-click (publishes 1.2.0), or run:  publish-docker.bat 1.3.0
REM  Needs: Docker Desktop running and signed in as adcbueno1
REM ============================================================
setlocal
cd /d "%~dp0"
set IMAGE=adcbueno1/virtual-science-park
set VERSION=%~1
if "%VERSION%"=="" set VERSION=1.2.0

echo.
echo  Publishing %IMAGE%:%VERSION% and %IMAGE%:latest
echo.

docker info >nul 2>&1
if errorlevel 1 (
  echo  [!] Docker Desktop is not running. Open it, wait until it says "Engine running", and try again.
  pause
  exit /b 1
)

echo  [1/3] Checking Docker Hub login...
docker login
if errorlevel 1 (
  echo  [!] Login failed. Username: adcbueno1  Password: a Docker Hub access token.
  pause
  exit /b 1
)

echo.
echo  [2/3] Building the image (first time takes a few minutes)...
docker build -t %IMAGE%:%VERSION% -t %IMAGE%:latest .
if errorlevel 1 (
  echo.
  echo  [!] The build failed. Copy the red error above and send it to Claude.
  pause
  exit /b 1
)

echo.
echo  [3/3] Pushing to Docker Hub...
docker push %IMAGE%:%VERSION%
if errorlevel 1 goto pushfail
docker push %IMAGE%:latest
if errorlevel 1 goto pushfail

echo.
echo  Done!  https://hub.docker.com/r/adcbueno1/virtual-science-park
echo  Teammates:  docker pull %IMAGE%:%VERSION%
echo.
pause
exit /b 0

:pushfail
echo.
echo  [!] The push failed. Check that you are signed in as adcbueno1, then send the error to Claude.
pause
exit /b 1
