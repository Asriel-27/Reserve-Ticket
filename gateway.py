"""
Gateway HTTP untuk frontend web reservasi bioskop.
Menghubungkan browser dengan server gRPC tanpa mengubah backend.

Kelompok: Omar, Rosy, Rozan
"""
import asyncio
import logging
import uuid
import json
from typing import AsyncGenerator

import grpc
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import bioskop_pb2 as pb
import client_bioskop

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="Bioskop Gateway")

# CORS agar frontend bisa akses API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========== Request Models ==========
class PesanRequest(BaseModel):
    kursi_id: str
    pemesan: str


class BatalRequest(BaseModel):
    kursi_id: str
    pemesan: str


# ========== gRPC Client Connection ==========
def get_client():
    """Buat koneksi ke gRPC server."""
    return client_bioskop.KlienBioskop(alamat="localhost:50051", timeout=2.0)


# ========== REST Endpoints ==========

@app.get("/api/kursi")
async def get_kursi():
    """Ambil daftar semua kursi."""
    client = get_client()
    try:
        resp = client.lihat(log=False)
        kursi_list = [
            {
                "kursi_id": k.kursi_id,
                "status": "DIPESAN" if k.status == pb.DIPESAN else "TERSEDIA",
                "pemesan": k.pemesan,
            }
            for k in resp.kursi
        ]
        return {"kursi": kursi_list, "versi": resp.versi}
    except grpc.RpcError as e:
        raise HTTPException(status_code=500, detail=f"{e.code().name}: {e.details()}")
    finally:
        client.tutup()


@app.post("/api/pesan")
async def pesan_kursi(req: PesanRequest):
    """Pesan kursi."""
    client = get_client()
    request_id = str(uuid.uuid4())
    try:
        resp = client.pesan(req.kursi_id, req.pemesan, request_id=request_id, log=False)
        return {
            "sukses": resp.sukses,
            "pesan": resp.pesan,
            "kursi_id": resp.kursi_id,
            "duplikat": resp.duplikat,
        }
    except grpc.RpcError as e:
        # Translate gRPC errors ke HTTP
        if e.code() == grpc.StatusCode.ALREADY_EXISTS:
            raise HTTPException(status_code=409, detail=e.details())
        elif e.code() == grpc.StatusCode.NOT_FOUND:
            raise HTTPException(status_code=404, detail=e.details())
        elif e.code() == grpc.StatusCode.INVALID_ARGUMENT:
            raise HTTPException(status_code=400, detail=e.details())
        else:
            raise HTTPException(status_code=500, detail=f"{e.code().name}: {e.details()}")
    finally:
        client.tutup()


@app.post("/api/batal")
async def batal_kursi(req: BatalRequest):
    """Batalkan pesanan kursi."""
    client = get_client()
    request_id = str(uuid.uuid4())
    try:
        resp = client.batal(req.kursi_id, req.pemesan, request_id=request_id, log=False)
        return {
            "sukses": resp.sukses,
            "pesan": resp.pesan,
            "duplikat": resp.duplikat,
        }
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.PERMISSION_DENIED:
            raise HTTPException(status_code=403, detail=e.details())
        elif e.code() == grpc.StatusCode.FAILED_PRECONDITION:
            raise HTTPException(status_code=412, detail=e.details())
        elif e.code() == grpc.StatusCode.NOT_FOUND:
            raise HTTPException(status_code=404, detail=e.details())
        else:
            raise HTTPException(status_code=500, detail=f"{e.code().name}: {e.details()}")
    finally:
        client.tutup()


@app.get("/api/stream")
async def stream_kursi():
    """Server-Sent Events untuk streaming perubahan kursi real-time."""
    
    async def event_generator() -> AsyncGenerator[str, None]:
        client = get_client()
        try:
            # Wrap blocking gRPC stream dalam executor
            loop = asyncio.get_event_loop()
            
            def stream_wrapper():
                """Generator yang yield events dari gRPC stream."""
                for event in client.pantau(snapshot=True, reconnect_delay=0.5):
                    yield event
            
            # Run blocking gRPC stream di thread pool
            stream_iter = stream_wrapper()
            while True:
                try:
                    event = await loop.run_in_executor(None, next, stream_iter, None)
                    if event is None:
                        break
                    
                    # Format SSE
                    data = {
                        "kursi_id": event.kursi_id,
                        "status": "DIPESAN" if event.status == pb.DIPESAN else "TERSEDIA",
                        "pemesan": event.pemesan,
                        "waktu": event.waktu,
                        "versi": event.versi,
                    }
                    yield f"data: {json.dumps(data)}\n\n"
                except StopIteration:
                    break
                except Exception as e:
                    logger.error(f"Stream error: {e}")
                    yield f"event: error\ndata: {str(e)}\n\n"
                    break
        finally:
            client.tutup()
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# Serve static files (frontend)
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting gateway on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
