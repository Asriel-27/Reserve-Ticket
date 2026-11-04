# RINGKASAN IMPLEMENTASI FRONTEND WEB

## Yang Sudah Dikerjakan

### 1. Gateway HTTP (gateway.py)
- FastAPI adapter yang menghubungkan browser dengan gRPC server
- Tidak mengubah backend sama sekali (zero modification)
- Endpoints:
  - `GET /api/kursi` - ambil daftar semua kursi
  - `POST /api/pesan` - pesan kursi (body: {kursi_id, pemesan})
  - `POST /api/batal` - batalkan pesanan (body: {kursi_id, pemesan})
  - `GET /api/stream` - Server-Sent Events untuk real-time updates
- Menggunakan `client_bioskop.KlienBioskop` yang sudah ada
- Mempertahankan request_id, retry, dan semua mekanisme backend

### 2. Frontend Web (frontend/)

**index.html**
- Structure HTML dengan semantic markup
- Dashboard dengan status koneksi
- Denah kursi bioskop 5 baris × 8 kolom
- Form pemesanan dan pembatalan
- Toast notifications

**style.css**
- Dark theme modern (navy #0F172A background)
- Minimalis, bersih, profesional
- Tidak ada gradient berlebihan atau glassmorphism
- Color scheme:
  - Tersedia: hijau #10B981
  - Dipilih: ungu #6366F1
  - Terpesan: abu-abu #475569
- Responsive untuk desktop dan mobile

**app.js**
- State management untuk kursi
- Real-time updates via Server-Sent Events (SSE)
- API calls ke gateway dengan error handling
- Auto-reconnect jika stream terputus
- Toast notifications untuk feedback user
- Update stats (tersedia/terpesan) otomatis

### 3. Dokumentasi

**README.md - Ditambahkan:**
- Penjelasan struktur frontend dan gateway
- Instruksi menjalankan frontend web
- Cara demonstrasi step-by-step
- Arsitektur integrasi diagram
- Penjelasan dependensi baru (fastapi, uvicorn)

**requirements.txt - Ditambahkan:**
- fastapi>=0.104.0
- uvicorn>=0.24.0

**Startup scripts:**
- `start.bat` (Windows)
- `start.sh` (Linux/macOS)

## Arsitektur Integrasi

```
┌──────────────────┐
│   Browser        │
│  (HTML/CSS/JS)   │
│  localhost:8000  │
└────────┬─────────┘
         │ HTTP/SSE
         ▼
┌──────────────────┐
│  Gateway         │
│  (gateway.py)    │
│  FastAPI         │
└────────┬─────────┘
         │ gRPC
         ▼
┌──────────────────┐
│  gRPC Server     │
│ server_bioskop.py│
│  localhost:50051 │
└──────────────────┘
```

## Cara Menjalankan

### Opsi 1: Manual

```bash
# Terminal 1
python server_bioskop.py

# Terminal 2
python gateway.py

# Browser
http://localhost:8000
```

### Opsi 2: Startup Script

**Windows:**
```
start.bat
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

## Skenario Demo Presentasi

1. **Setup:**
   - Jalankan server gRPC: `python server_bioskop.py`
   - Jalankan gateway: `python gateway.py`
   - Buka browser: `http://localhost:8000`

2. **Demo Pemesanan:**
   - Klik kursi A1 (hijau)
   - Isi nama: "Omar"
   - Klik "Pesan Sekarang"
   - Lihat kursi A1 berubah merah
   - Lihat notifikasi sukses

3. **Demo Conflict:**
   - Klik kursi A1 lagi (sekarang merah)
   - Tooltip muncul: "Dipesan oleh: Omar"
   - Coba pesan kursi B1 dengan nama "Rosy"
   - Berhasil, kursi B1 jadi merah

4. **Demo Pembatalan:**
   - Di form pembatalan, isi:
     - Nomor kursi: A1
     - Nama: "Rozan" (salah)
   - Klik "Batalkan Pesanan"
   - Error: PERMISSION_DENIED
   - Ganti nama ke "Omar"
   - Klik lagi - berhasil
   - Kursi A1 kembali hijau

5. **Demo Real-Time:**
   - Buka tab browser kedua: `http://localhost:8000`
   - Di tab 1: pesan kursi C5
   - Di tab 2: otomatis update tanpa refresh
   - Lihat notifikasi muncul di tab 2

6. **Demo Streaming Reconnect:**
   - Matikan server gRPC (Ctrl+C di terminal server)
   - Lihat status "Terputus" di frontend
   - Jalankan server lagi
   - Status otomatis "Terhubung" kembali

## Fitur yang Diimplementasi

✅ Denah kursi 5×8 dengan visual status
✅ Pemesanan kursi dengan validasi
✅ Pembatalan pesanan (hanya pemesan asli)
✅ Real-time updates via SSE
✅ Auto-reconnect jika koneksi terputus
✅ Toast notifications
✅ Error handling lengkap
✅ Stats counter (tersedia/terpesan)
✅ Connection status indicator
✅ Responsive design
✅ Clean dark theme minimal

## Yang TIDAK Diubah

❌ Backend gRPC (server_bioskop.py) - 100% tidak tersentuh
❌ Client CLI (client_bioskop.py) - masih berfungsi penuh
❌ Protocol buffers (bioskop.proto) - tidak ada perubahan
❌ Mekanisme Lock, request_id, retry - semua tetap utuh
❌ Test beban (test_beban.py) - masih bisa dijalankan

## Teknologi yang Digunakan

**Backend Gateway:**
- FastAPI - modern Python web framework
- Uvicorn - ASGI server
- asyncio - untuk handle SSE streaming

**Frontend:**
- Vanilla JavaScript (no framework)
- CSS Grid & Flexbox
- Server-Sent Events API
- Fetch API

**Alasan tidak pakai React/Vue:**
- Lebih sederhana untuk demo
- Tidak perlu build process
- Mudah dipahami untuk presentasi
- Cepat dimuat

## Instalasi Dependensi

```bash
# Aktifkan venv terlebih dahulu
source venv/bin/activate  # Linux/macOS
# atau
venv\Scripts\activate     # Windows

# Install
pip install -r requirements.txt
```

Jika `pip install` error, install manual:
```bash
pip install fastapi uvicorn
```

## Troubleshooting

**Port 8000 sudah dipakai:**
```bash
# Edit gateway.py, ubah port di baris terakhir:
uvicorn.run(app, host="0.0.0.0", port=8001)
```

**gRPC server tidak tersambung:**
- Pastikan server_bioskop.py jalan di port 50051
- Check firewall jika beda komputer

**Frontend tidak muncul:**
- Pastikan folder `frontend/` ada
- Check console browser (F12) untuk error
- Pastikan gateway.py jalan tanpa error

**SSE tidak reconnect:**
- Normal jika server mati lama
- Refresh browser jika perlu

## File yang Ditambahkan

```
Reservasi-Tiket/
├── gateway.py          ← BARU: HTTP adapter
├── start.bat           ← BARU: startup script Windows
├── start.sh            ← BARU: startup script Linux/macOS
├── frontend/           ← BARU: folder frontend
│   ├── index.html      ← BARU: HTML structure
│   ├── style.css       ← BARU: styling
│   └── app.js          ← BARU: JavaScript logic
├── requirements.txt    ← DIUPDATE: +fastapi +uvicorn
└── README.md           ← DIUPDATE: instruksi frontend
```

## Verifikasi

Untuk memastikan semua berfungsi:

1. Check file ada:
   ```bash
   ls -la gateway.py frontend/
   ```

2. Check dependensi:
   ```bash
   python -c "import fastapi; import uvicorn; print('OK')"
   ```

3. Test gateway:
   ```bash
   # Terminal 1
   python server_bioskop.py
   
   # Terminal 2
   python gateway.py
   
   # Terminal 3
   curl http://localhost:8000/api/kursi
   ```

4. Test frontend:
   - Buka http://localhost:8000
   - Lihat denah kursi muncul
   - Coba pesan dan batalkan

## Kesimpulan

Frontend web reservasi tiket bioskop berhasil dibuat dengan:
- Zero perubahan pada backend gRPC
- Integrasi penuh dengan semua 4 RPC
- Real-time streaming untuk pemantauan kursi
- UI yang bersih, minimal, dan profesional
- Mudah didemonstrasikan untuk presentasi
- Dokumentasi lengkap

Semua requirement dari task terpenuhi.
