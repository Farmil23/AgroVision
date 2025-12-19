document.addEventListener('DOMContentLoaded', () => {
    // Check Leaflet
    if (typeof L === 'undefined') {
        console.error("LeafletJS not loaded!");
        return;
    }

    // --- 1. CONFIG & STATE ---
    const CONFIG = {
        droneIconSize: 20,
        updateRate: 1000,   // Physics tick every 1s (UI animates smoothly via CSS transition if possible, or we update faster)
        // Let's actually update UI faster for smoothness, or keep 1s but smoother CSS
        // For game-like feel, let's run physics at 10Hz (100ms)
        tickRate: 100
    };

    // SIMULATION STATE (Client Side)
    const SimState = {
        lat: -6.2088,
        lon: 106.8456,
        alt: 50,
        speed: 10,
        battery: 100,
        heading: 0,
        mode: "LOITER",
        target: null, // {lat, lon}
        spreader: false,
        tick: 0,
        detections: [] // Array of {lat, lon, time}
    };

    const existingDetections = new Set();
    let isAutoLocked = true;
    let targetMarker = null;
    let targetLine = null;

    // Notifications
    let unreadCount = 0;
    const notifBadge = document.getElementById('notif-badge');
    const notifPanel = document.getElementById('notif-panel');
    const listLive = document.getElementById('notif-list-live');

    // --- 2. JARVIS (Voice AI) ---
    class VoiceAssistant {
        constructor() {
            this.synth = window.speechSynthesis;
            this.enabled = true;
            this.voicesLoaded = false;
        }

        speak(text) {
            if (!this.enabled) return;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;

            // Try to pick a good voice
            const voices = this.synth.getVoices();
            const preferred = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha'));
            if (preferred) utterance.voice = preferred;

            this.synth.speak(utterance);
        }

        setEnabled(enabled) {
            this.enabled = enabled;
            if (!enabled) this.synth.cancel();

            const btn = document.getElementById('btn-voice-toggle');
            if (btn) {
                const icon = btn.querySelector('i');
                if (enabled) {
                    btn.style.color = 'var(--primary)';
                    btn.style.borderColor = 'var(--primary)';
                    icon.setAttribute('data-lucide', 'mic');
                    this.speak("Voice systems online.");
                } else {
                    btn.style.color = 'var(--text-muted)';
                    btn.style.borderColor = 'var(--glass-border)';
                    icon.setAttribute('data-lucide', 'mic-off');
                }
                if (window.lucide) lucide.createIcons();
            }
        }
    }
    const jarvis = new VoiceAssistant();
    window.speechSynthesis.onvoiceschanged = () => { jarvis.voicesLoaded = true; };


    // --- 3. MAP SETUP ---
    const map = L.map('main-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([SimState.lat, SimState.lon], 18);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd'
    }).addTo(map);

    const droneIcon = L.divIcon({
        className: 'drone-icon-container',
        html: `<div style="
            width: 20px; height: 20px; 
            background: #00f0ff; 
            border-radius: 50%; 
            border: 2px solid white;
            box-shadow: 0 0 15px #00f0ff;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const droneMarker = L.marker([SimState.lat, SimState.lon], { icon: droneIcon }).addTo(map);
    const flightPath = L.polyline([], { color: '#00f0ff', weight: 2, opacity: 0.6 }).addTo(map);

    // --- 4. PHYSICS ENGINE ---
    function runPhysics() {
        SimState.tick++;

        // 1. Battery Drain
        const drain = SimState.spreader ? 0.05 : 0.01; // Slower drain for 10Hz
        SimState.battery = Math.max(0, SimState.battery - drain);

        // 2. Movement
        if (SimState.target) {
            SimState.mode = "MISSION";
            const dLat = SimState.target.lat - SimState.lat;
            const dLon = SimState.target.lon - SimState.lon;
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);

            if (dist < 0.00005) { // Reached dest
                SimState.target = null;
                SimState.mode = "LOITER";
                jarvis.speak("Destination reached. Holding position.");
            } else {
                const speed = 0.00002; // Movement per tick
                SimState.lat += (dLat / dist) * speed;
                SimState.lon += (dLon / dist) * speed;
            }
        } else {
            // Loiter Pattern (Circle)
            SimState.mode = "LOITER";
            const t = SimState.tick * 0.01;
            // Add slight drift
            SimState.lat += Math.sin(t) * 0.000005;
            SimState.lon += Math.cos(t) * 0.000005;
        }

        // 3. Telemetry Noise
        SimState.alt = 50 + Math.sin(SimState.tick * 0.05) * 5;
        SimState.speed = SimState.mode === "MISSION" ? 12 : (10 + Math.sin(SimState.tick * 0.1));

        // 4. AI Detection (Random)
        if (Math.random() < 0.005) { // Lower prob because tick is fast
            // Detect!
            const detLat = SimState.lat + (Math.random() * 0.0002 - 0.0001);
            const detLon = SimState.lon + (Math.random() * 0.0002 - 0.0001);
            const timestamp = new Date().toLocaleTimeString();

            // Log it
            const det = { lat: detLat, lon: detLon, time: timestamp, id: Date.now() };
            SimState.detections.push(det);

            // Add UI (Marker & Notif)
            L.circleMarker([detLat, detLon], {
                radius: 6,
                fillColor: '#00ff9d',
                color: '#00ff9d',
                weight: 1,
                fillOpacity: 0.8
            }).bindPopup("Humus Verified").addTo(map);

            addNotification(detLat, detLon, timestamp);
            jarvis.speak("Organic material detected.");
        }

        updateUI();
    }

    // --- 5. UI UPDATES ---
    function updateUI() {
        // Telemetry Panels
        document.getElementById('val-alt').innerText = SimState.alt.toFixed(1);
        document.getElementById('bar-alt').style.width = Math.min(SimState.alt, 100) + '%';

        document.getElementById('val-speed').innerText = SimState.speed.toFixed(1);
        document.getElementById('bar-speed').style.width = Math.min(SimState.speed * 2, 100) + '%';

        const batBar = document.getElementById('bar-bat');
        document.getElementById('val-bat').innerText = SimState.battery.toFixed(1);
        batBar.style.width = SimState.battery + '%';
        if (SimState.battery < 20) batBar.classList.replace('success', 'danger');

        document.getElementById('val-lat').innerText = SimState.lat.toFixed(6);
        document.getElementById('val-lon').innerText = SimState.lon.toFixed(6);

        // Map Position
        const newPos = [SimState.lat, SimState.lon];
        droneMarker.setLatLng(newPos);
        flightPath.addLatLng(newPos);

        if (isAutoLocked) {
            map.setView(newPos, map.getZoom(), { animate: false }); // Disable animate for 10Hz smoothness
        }

        // Interactive Lines
        if (SimState.target && targetMarker) {
            if (targetLine) map.removeLayer(targetLine);
            targetLine = L.polyline([newPos, targetMarker.getLatLng()], {
                color: '#00f0ff',
                dashArray: '5, 10',
                weight: 2,
                opacity: 0.5
            }).addTo(map);
        } else if (targetLine) {
            map.removeLayer(targetLine);
            targetLine = null;
        }

        // Weather (Mock)
        document.getElementById('val-temp').innerText = "29°C";
        document.getElementById('val-wind').innerText = "14 km/h";
    }

    // --- 6. CONTROLLERS & ACTIONS ---

    // Init Voice
    setTimeout(() => {
        jarvis.speak("System Online. Connected to Local Client.");
        const vBtn = document.getElementById('btn-voice-toggle');
        if (vBtn) {
            vBtn.style.color = 'var(--primary)';
            vBtn.style.borderColor = 'var(--primary)';
        }
    }, 1500);

    // Helpers
    function addNotification(lat, lon, time) {
        // Dropdown
        const listLive = document.getElementById('notif-list-live');
        if (listLive) {
            const item = document.createElement('li');
            item.className = 'notif-item';
            item.innerHTML = `
                <div class="notif-icon"><i data-lucide="sprout"></i></div>
                <div>
                    <strong style="font-size:0.8rem; color:#fff;">Humus Found</strong>
                    <div style="font-size:0.7rem; color:#94a3b8;">${time}</div>
                </div>
            `;
            listLive.prepend(item);
        }

        // Sidebar Log
        const logList = document.getElementById('detection-log');
        if (logList) {
            const sideItem = document.createElement('li');
            sideItem.className = 'log-item';
            sideItem.innerHTML = `
                <strong>HUMUS DETECTED</strong>
                <span style="color:#64748b; font-size:0.75rem">
                    Lat: ${lat.toFixed(4)}...
                </span>
            `;
            logList.prepend(sideItem);
        }

        // Badge
        unreadCount++;
        const badge = document.getElementById('notif-badge');
        if (badge) {
            badge.innerText = unreadCount;
            badge.style.display = 'flex';
            // Center text
            badge.style.alignItems = 'center';
            badge.style.justifyContent = 'center';
        }

        if (window.lucide) lucide.createIcons();
    }

    // Event: Toggle Voice
    const btnVoice = document.getElementById('btn-voice-toggle');
    if (btnVoice) btnVoice.addEventListener('click', () => jarvis.setEnabled(!jarvis.enabled));

    // Event: Toggle Lock
    const btnLock = document.getElementById('btn-auto-lock');
    if (btnLock) btnLock.addEventListener('click', () => {
        isAutoLocked = !isAutoLocked;
        const icon = btnLock.querySelector('i');
        const span = btnLock.querySelector('span');
        if (isAutoLocked) {
            btnLock.classList.add('active');
            span.innerText = "LOCKED";
            icon.setAttribute('data-lucide', 'crosshair');
        } else {
            btnLock.classList.remove('active');
            span.innerText = "FREE";
            icon.setAttribute('data-lucide', 'unlock');
        }
        lucide.createIcons();
    });

    // Event: Spreader
    const btnSpreader = document.getElementById('btn-spreader');
    if (btnSpreader) btnSpreader.addEventListener('change', (e) => {
        SimState.spreader = e.target.checked;
        jarvis.speak(SimState.spreader ? "Payload active." : "Payload standby.");
    });

    // Event: Export CSV
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', () => {
        // Client-side CSV generation
        const header = "Timestamp,Latitude,Longitude\n";
        const rows = SimState.detections.map(d => `${d.time},${d.lat},${d.lon}`).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + header + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "agrovision_report.csv");
        document.body.appendChild(link); // Required for FF
        link.click();
        document.body.removeChild(link);

        jarvis.speak("Exporting flight data.");
    });

    // Event: Notifications Panel
    const btnNotif = document.getElementById('btn-notif');
    if (btnNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                unreadCount = 0; // Read all
                if (notifBadge) notifBadge.style.display = 'none';
            }
        });
    }
    document.addEventListener('click', (e) => {
        if (notifPanel && !notifPanel.classList.contains('hidden')) {
            if (!notifPanel.contains(e.target) && !btnNotif.contains(e.target)) {
                notifPanel.classList.add('hidden');
            }
        }
    });

    // Event: Mission Mode
    const missionModal = document.getElementById('mission-modal');
    let pendingCoords = null;

    map.on('click', (e) => {
        if (!isAutoLocked) {
            pendingCoords = e.latlng;
            document.getElementById('modal-lat').innerText = pendingCoords.lat.toFixed(5);
            document.getElementById('modal-lon').innerText = pendingCoords.lng.toFixed(5);
            missionModal.classList.remove('hidden');
        }
    });

    document.getElementById('btn-cancel-mission').addEventListener('click', () => {
        missionModal.classList.add('hidden');
    });

    document.getElementById('btn-confirm-mission').addEventListener('click', () => {
        if (pendingCoords) {
            SimState.target = { lat: pendingCoords.lat, lon: pendingCoords.lng };
            jarvis.speak("Coordinates confirmed. Engaging engine.");

            if (targetMarker) map.removeLayer(targetMarker);
            targetMarker = L.marker([pendingCoords.lat, pendingCoords.lng], {
                icon: L.divIcon({
                    className: 'target-icon',
                    html: '<div style="color:#00f0ff; font-size:24px; text-shadow:0 0 10px #00f0ff;">⊕</div>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);

            missionModal.classList.add('hidden');
        }
    });

    // CLOCK
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString();
    }, 1000);

    // START ENGINE
    setInterval(runPhysics, CONFIG.tickRate);
});
