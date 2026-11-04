#!/bin/bash

echo "========================================"
echo "  Reservasi Tiket Bioskop - Startup"
echo "========================================"
echo ""

# Check venv
if [ ! -f "venv/bin/python" ]; then
    echo "[ERROR] Virtual environment tidak ditemukan."
    echo "Jalankan: python3 -m venv venv"
    echo "Lalu: source venv/bin/activate"
    echo "Lalu: pip install -r requirements.txt"
    exit 1
fi

echo "[1/3] Memeriksa dependensi..."
venv/bin/python -c "import grpc; import fastapi; import uvicorn" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "[INFO] Menginstall dependensi..."
    venv/bin/python -m pip install -q -r requirements.txt
    if [ $? -ne 0 ]; then
        echo "[ERROR] Gagal install dependensi"
        exit 1
    fi
fi

echo "[2/3] Memulai gRPC server di port 50051..."
venv/bin/python server_bioskop.py &
SERVER_PID=$!

sleep 2

echo "[3/3] Memulai gateway HTTP di port 8000..."
venv/bin/python gateway.py &
GATEWAY_PID=$!

sleep 3

echo ""
echo "========================================"
echo "  APLIKASI BERJALAN"
echo "========================================"
echo ""
echo "  Frontend Web: http://localhost:8000"
echo ""
echo "  Tekan Ctrl+C untuk menghentikan"
echo "========================================"
echo ""

# Trap Ctrl+C to kill both processes
trap "kill $SERVER_PID $GATEWAY_PID 2>/dev/null; exit" INT TERM

# Open browser (works on macOS and Linux)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:8000
elif command -v open &> /dev/null; then
    open http://localhost:8000
fi

# Wait for both processes
wait $SERVER_PID $GATEWAY_PID
