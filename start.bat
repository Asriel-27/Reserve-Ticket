@echo off
echo ========================================
echo   Reservasi Tiket Bioskop - Startup
echo ========================================
echo.

REM Check venv
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment tidak ditemukan.
    echo Jalankan: python -m venv venv
    echo Lalu: venv\Scripts\activate
    echo Lalu: pip install -r requirements.txt
    pause
    exit /b 1
)

echo [1/3] Memeriksa dependensi...
venv\Scripts\python.exe -c "import grpc; import fastapi; import uvicorn" 2>nul
if errorlevel 1 (
    echo [INFO] Menginstall dependensi...
    venv\Scripts\python.exe -m pip install -q -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Gagal install dependensi
        pause
        exit /b 1
    )
)

echo [2/3] Memulai gRPC server di port 50051...
start "gRPC Server" venv\Scripts\python.exe server_bioskop.py

timeout /t 2 /nobreak >nul

echo [3/3] Memulai gateway HTTP di port 8000...
start "HTTP Gateway" venv\Scripts\python.exe gateway.py

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   APLIKASI BERJALAN
echo ========================================
echo.
echo   Frontend Web: http://localhost:8000
echo.
echo   Tekan Ctrl+C di masing-masing window
echo   untuk menghentikan server.
echo ========================================
echo.

REM Open browser
start http://localhost:8000

pause
