@echo off
REM ============================================
REM  Daily Current Affairs Scraper + MCQ Generator
REM ============================================

echo.
echo ========================================
echo   UPSC Current Affairs Daily Update
echo ========================================
echo.

REM Change to script directory
cd /d "%~dp0"

echo [1/3] Checking Python installation...
python --version > nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

echo [2/3] Installing required packages...
pip install requests beautifulsoup4 lxml --quiet

echo.
echo [3/3] Running scraper...
echo.

python current_affairs_scraper.py --source all --output ../data

if errorlevel 1 (
    echo.
    echo ERROR: Scraping failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Generating MCQs...
echo ========================================
echo.

python mcq_generator.py --output ../data

echo.
echo ========================================
echo   COMPLETE!
echo ========================================
echo.
echo Data saved to: GenZ-Mock\data\
echo.
pause
