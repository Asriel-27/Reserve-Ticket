// State
let seats = [];
let selectedSeatId = null;
let eventSource = null;

// Constants
const ROWS = ['A', 'B', 'C', 'D', 'E'];
const COLS = 8;
const API_BASE = window.location.origin;

// DOM Elements
const seatGrid = document.getElementById('seatGrid');
const selectedSeatInput = document.getElementById('selectedSeat');
const bookingNameInput = document.getElementById('bookingName');
const bookBtn = document.getElementById('bookBtn');
const cancelSeatInput = document.getElementById('cancelSeat');
const cancelNameInput = document.getElementById('cancelName');
const cancelBtn = document.getElementById('cancelBtn');
const availableCount = document.getElementById('availableCount');
const bookedCount = document.getElementById('bookedCount');
const connectionStatus = document.getElementById('connectionStatus');
const connectionText = document.getElementById('connectionText');
const toast = document.getElementById('toast');

// Initialize
async function init() {
    await loadSeats();
    renderSeats();
    setupEventListeners();
    connectStream();
}

// Load seats from API
async function loadSeats() {
    try {
        const response = await fetch(`${API_BASE}/api/kursi`);
        if (!response.ok) throw new Error('Failed to load seats');
        const data = await response.json();
        seats = data.kursi;
        updateStats();
    } catch (error) {
        showToast('Gagal memuat data kursi: ' + error.message, 'error');
    }
}

// Render seat grid
function renderSeats() {
    seatGrid.innerHTML = '';
    
    ROWS.forEach(row => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'seat-row';
        
        const label = document.createElement('div');
        label.className = 'row-label';
        label.textContent = row;
        rowDiv.appendChild(label);
        
        const seatsDiv = document.createElement('div');
        seatsDiv.className = 'seats';
        
        for (let col = 1; col <= COLS; col++) {
            const seatId = `${row}${col}`;
            const seatData = seats.find(s => s.kursi_id === seatId);
            
            const seatDiv = document.createElement('div');
            seatDiv.className = 'seat';
            seatDiv.dataset.seatId = seatId;
            seatDiv.textContent = seatId;
            
            if (seatData) {
                if (seatData.status === 'DIPESAN') {
                    seatDiv.classList.add('booked');
                    seatDiv.title = `Dipesan oleh: ${seatData.pemesan}`;
                } else {
                    seatDiv.classList.add('available');
                    seatDiv.addEventListener('click', () => selectSeat(seatId));
                }
            } else {
                seatDiv.classList.add('available');
                seatDiv.addEventListener('click', () => selectSeat(seatId));
            }
            
            if (selectedSeatId === seatId && seatData?.status !== 'DIPESAN') {
                seatDiv.classList.remove('available');
                seatDiv.classList.add('selected');
            }
            
            seatsDiv.appendChild(seatDiv);
        }
        
        rowDiv.appendChild(seatsDiv);
        seatGrid.appendChild(rowDiv);
    });
}

// Select seat
function selectSeat(seatId) {
    const seatData = seats.find(s => s.kursi_id === seatId);
    if (seatData && seatData.status === 'DIPESAN') {
        showToast(`Kursi ${seatId} sudah dipesan oleh ${seatData.pemesan}`, 'error');
        return;
    }
    
    selectedSeatId = seatId;
    selectedSeatInput.value = seatId;
    renderSeats();
}

// Update statistics
function updateStats() {
    const available = seats.filter(s => s.status === 'TERSEDIA').length;
    const booked = seats.filter(s => s.status === 'DIPESAN').length;
    availableCount.textContent = available;
    bookedCount.textContent = booked;
}

// Book seat
async function bookSeat() {
    const seatId = selectedSeatInput.value.trim();
    const name = bookingNameInput.value.trim();
    
    if (!seatId) {
        showToast('Pilih kursi terlebih dahulu', 'error');
        return;
    }
    
    if (!name) {
        showToast('Masukkan nama pemesan', 'error');
        return;
    }
    
    bookBtn.disabled = true;
    bookBtn.textContent = 'Memproses...';
    
    try {
        const response = await fetch(`${API_BASE}/api/pesan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kursi_id: seatId, pemesan: name })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.pesan, 'success');
            bookingNameInput.value = '';
            selectedSeatInput.value = '';
            selectedSeatId = null;
            await loadSeats();
            renderSeats();
        } else {
            showToast(data.detail || 'Pemesanan gagal', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        bookBtn.disabled = false;
        bookBtn.textContent = 'Pesan Sekarang';
    }
}

// Cancel booking
async function cancelBooking() {
    const seatId = cancelSeatInput.value.trim().toUpperCase();
    const name = cancelNameInput.value.trim();
    
    if (!seatId) {
        showToast('Masukkan nomor kursi', 'error');
        return;
    }
    
    if (!name) {
        showToast('Masukkan nama pemesan', 'error');
        return;
    }
    
    cancelBtn.disabled = true;
    cancelBtn.textContent = 'Memproses...';
    
    try {
        const response = await fetch(`${API_BASE}/api/batal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ kursi_id: seatId, pemesan: name })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(data.pesan, 'success');
            cancelSeatInput.value = '';
            cancelNameInput.value = '';
            await loadSeats();
            renderSeats();
        } else {
            showToast(data.detail || 'Pembatalan gagal', 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    } finally {
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Batalkan Pesanan';
    }
}

// Connect to SSE stream
function connectStream() {
    if (eventSource) {
        eventSource.close();
    }
    
    updateConnectionStatus('connecting');
    
    eventSource = new EventSource(`${API_BASE}/api/stream`);
    
    eventSource.onopen = () => {
        updateConnectionStatus('connected');
        console.log('Stream connected');
    };
    
    eventSource.onmessage = (event) => {
        try {
            // Parse SSE data (format: "data: {...}\n\n")
            const data = JSON.parse(event.data.replace(/^data: /, ''));
            handleStreamUpdate(data);
        } catch (error) {
            console.error('Failed to parse stream data:', error);
        }
    };
    
    eventSource.onerror = (error) => {
        console.error('Stream error:', error);
        updateConnectionStatus('disconnected');
        eventSource.close();
        
        // Reconnect after 3 seconds
        setTimeout(() => {
            console.log('Reconnecting stream...');
            connectStream();
        }, 3000);
    };
}

// Handle stream updates
function handleStreamUpdate(data) {
    const { kursi_id, status, pemesan, waktu } = data;
    
    // Update local state
    const seatIndex = seats.findIndex(s => s.kursi_id === kursi_id);
    if (seatIndex !== -1) {
        seats[seatIndex] = { kursi_id, status, pemesan };
    } else {
        seats.push({ kursi_id, status, pemesan });
    }
    
    // Re-render and update stats
    renderSeats();
    updateStats();
    
    // Show notification for changes (skip snapshots)
    if (waktu !== 'snapshot') {
        const message = status === 'DIPESAN' 
            ? `Kursi ${kursi_id} dipesan oleh ${pemesan}`
            : `Kursi ${kursi_id} tersedia kembali`;
        showToast(message, 'info', 2000);
    }
}

// Update connection status
function updateConnectionStatus(status) {
    connectionStatus.className = 'indicator';
    
    if (status === 'connected') {
        connectionStatus.classList.add('connected');
        connectionText.textContent = 'Terhubung';
    } else if (status === 'disconnected') {
        connectionStatus.classList.add('disconnected');
        connectionText.textContent = 'Terputus';
    } else {
        connectionText.textContent = 'Menghubungkan...';
    }
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Setup event listeners
function setupEventListeners() {
    bookBtn.addEventListener('click', bookSeat);
    cancelBtn.addEventListener('click', cancelBooking);
    
    // Enter key support
    bookingNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') bookSeat();
    });
    
    cancelNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') cancelBooking();
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (eventSource) {
        eventSource.close();
    }
});

// Start app
init();
