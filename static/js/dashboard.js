document.addEventListener('DOMContentLoaded', () => {
    // Check Leaflet
    if (typeof L === 'undefined') {
        console.error("LeafletJS not loaded!");
        return;
    }

    // --- 1. VOICE ASSISTANT (JARVIS) ---
    class VoiceAssistant {
        constructor() {
            this.synth = window.speechSynthesis;
            this.enabled = true;
        }

        speak(text) {
            if (!this.enabled) return;
            // Cancel current to avoid backlog? Maybe not for critical things.
            // this.synth.cancel(); 
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;

            // Voice Selection
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
                    btn.style.borderColor = 'var(--primary)';
                    btn.style.color = 'var(--primary)';
                    icon.setAttribute('data-lucide', 'mic');
                    this.speak("Voice systems online.");
                } else {
                    btn.style.borderColor = 'var(--glass-border)';
                    btn.style.color = 'var(--text-muted)';
                    icon.setAttribute('data-lucide', 'mic-off');
                }
                if (window.lucide) lucide.createIcons();
            }
        }
    }

    const jarvis = new VoiceAssistant();
    // Allow voices to load (async)
    window.speechSynthesis.onvoiceschanged = () => {
        // Ready
    };

    // --- 2. MAP SETUP ---
    const map = L.map('main-map', {
        zoomControl: false,
        attributionControl: false
    }).setView([-6.2088, 106.8456], 16);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20,
        subdomains: 'abcd'
    }).addTo(map);

    const droneIcon = L.divIcon({
        className: 'drone-icon-container',
        html: `<div style="
            width: 20px; 
            height: 20px; 
            background: #00f0ff; 
            border-radius: 50%; 
            border: 2px solid white;
            box-shadow: 0 0 15px #00f0ff;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const droneMarker = L.marker([-6.2088, 106.8456], { icon: droneIcon }).addTo(map);
    const flightPath = L.polyline([], { color: '#00f0ff', weight: 2, opacity: 0.6 }).addTo(map);
    const existingDetections = new Set(); // Store detection IDs

    // --- 3. STATE & HELPERS ---
    let isAutoLocked = true;
    let targetMarker = null;
    let targetLine = null;

    // Notifications State
    let unreadCount = 0;
    const notifBadge = document.getElementById('notif-badge');
    const notifPanel = document.getElementById('notif-panel');
    const listLive = document.getElementById('notif-list-live');

    // Helper: Add Notification
    function addNotification(lat, lon, time) {
        // Dropdown List
        if (listLive) {
            const item = document.createElement('li');
            item.className = 'notif-item';
            item.innerHTML = `
                <div class="notif-icon"><i data-lucide="sprout"></i></div>
                <div>
                    <strong style="font-size:0.8rem; color:#fff;">Humus Verified</strong>
                    <div style="font-size:0.7rem; color:#94a3b8;">Loc: ${lat.toFixed(4)}, ${lon.toFixed(4)}</div>
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
                    Lat: ${lat.toFixed(5)}, Lon: ${lon.toFixed(5)}
                </span>
            `;
            logList.prepend(sideItem);
        }

        // Update Badge
        if (notifPanel && notifPanel.classList.contains('hidden')) {
            unreadCount++;
            if (notifBadge) {
                notifBadge.innerText = unreadCount;
                notifBadge.style.display = 'flex';
                notifBadge.style.alignItems = 'center';
                notifBadge.style.justifyContent = 'center';
            }
        }

        // Re-render icons
        if (window.lucide) lucide.createIcons();
    }


    // --- 4. EVENT LISTENERS ---

    // Init Voice
    setTimeout(() => {
        jarvis.speak("System Online. Agro Vision connected.");
        // Set toggle visual state
        const vBtn = document.getElementById('btn-voice-toggle');
        if (vBtn) {
            vBtn.style.color = 'var(--primary)';
            vBtn.style.borderColor = 'var(--primary)';
        }
    }, 1500);

    // Voice Toggle
    const btnVoice = document.getElementById('btn-voice-toggle');
    if (btnVoice) {
        btnVoice.addEventListener('click', () => {
            jarvis.setEnabled(!jarvis.enabled);
        });
    }

    // Auto Lock Toggle
    const btnLock = document.getElementById('btn-auto-lock');
    if (btnLock) {
        btnLock.addEventListener('click', () => {
            isAutoLocked = !isAutoLocked;
            const span = btnLock.querySelector('span');
            const icon = btnLock.querySelector('i');

            if (isAutoLocked) {
                btnLock.classList.add('active');
                span.innerText = 'LOCKED';
                icon.setAttribute('data-lucide', 'crosshair');
            } else {
                btnLock.classList.remove('active');
                span.innerText = 'FREE';
                icon.setAttribute('data-lucide', 'unlock');
            }
            if (window.lucide) lucide.createIcons();
        });
    }

    // Notification Toggle
    const btnNotif = document.getElementById('btn-notif');
    if (btnNotif) {
        btnNotif.addEventListener('click', (e) => {
            e.stopPropagation();
            notifPanel.classList.toggle('hidden');
            if (!notifPanel.classList.contains('hidden')) {
                unreadCount = 0;
                if (notifBadge) notifBadge.style.display = 'none';
            }
        });
    }

    // Close Notif on Outside Click
    document.addEventListener('click', (e) => {
        if (notifPanel && !notifPanel.classList.contains('hidden')) {
            if (!notifPanel.contains(e.target) && !btnNotif.contains(e.target)) {
                notifPanel.classList.add('hidden');
            }
        }
    });

    // Spreader Toggle
    const btnSpreader = document.getElementById('btn-spreader');
    if (btnSpreader) {
        btnSpreader.addEventListener('change', (e) => {
            fetch('/api/control/spreader', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: e.target.checked })
            });
            jarvis.speak(e.target.checked ? "Spreader activated." : "Spreader deactivated.");
        });
    }

    // Export Button
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            window.location.href = '/api/export';
            jarvis.speak("Downloading flight data.");
        });
    }

    // Mission / Map Click Logic
    let pendingCoords = null;
    const missionModal = document.getElementById('mission-modal');

    map.on('click', (e) => {
        if (!isAutoLocked) {
            pendingCoords = e.latlng;
            document.getElementById('modal-lat').innerText = pendingCoords.lat.toFixed(5);
            document.getElementById('modal-lon').innerText = pendingCoords.lng.toFixed(5);
            missionModal.classList.remove('hidden');
        }
    });

    // Modal Buttons
    const btnMissionCancel = document.getElementById('btn-cancel-mission');
    if (btnMissionCancel) {
        btnMissionCancel.addEventListener('click', () => {
            missionModal.classList.add('hidden');
            pendingCoords = null;
        });
    }

    const btnMissionConfirm = document.getElementById('btn-confirm-mission');
    if (btnMissionConfirm) {
        btnMissionConfirm.addEventListener('click', () => {
            if (pendingCoords) {
                fetch('/api/control/goto', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lat: pendingCoords.lat, lon: pendingCoords.lng })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.status === 'success') {
                            jarvis.speak("Coordinates accepted. Engaging auto pilot.");

                            if (targetMarker) map.removeLayer(targetMarker);
                            if (targetLine) map.removeLayer(targetLine);

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
            }
        });
    }


    // --- 5. POLLING LOOP ---
    function updateDashboard() {
        // Telemetry
        fetch('/api/telemetry')
            .then(res => res.json())
            .then(data => {
                // UI Updates
                document.getElementById('val-alt').innerText = data.altitude;
                document.getElementById('bar-alt').style.width = Math.min(data.altitude, 100) + '%';

                document.getElementById('val-speed').innerText = data.speed;
                document.getElementById('bar-speed').style.width = Math.min(data.speed * 2, 100) + '%';

                const batEl = document.getElementById('val-bat');
                batEl.innerText = data.battery;
                const batBar = document.getElementById('bar-bat');
                batBar.style.width = data.battery + '%';

                if (data.battery < 20) {
                    batBar.classList.replace('success', 'danger');
                    // Throttle low battery warning?
                }

                document.getElementById('val-lat').innerText = data.lat.toFixed(6);
                document.getElementById('val-lon').innerText = data.lon.toFixed(6);

                const newPos = [data.lat, data.lon];
                droneMarker.setLatLng(newPos);
                flightPath.addLatLng(newPos);

                // Auto Lock Camera
                if (isAutoLocked) {
                    map.setView(newPos, map.getZoom(), { animate: true });
                }

                // Draw Target Line
                if (targetMarker) {
                    const tPos = targetMarker.getLatLng();
                    if (targetLine) map.removeLayer(targetLine);
                    targetLine = L.polyline([newPos, tPos], {
                        color: '#00f0ff',
                        dashArray: '5, 10',
                        weight: 2,
                        opacity: 0.5
                    }).addTo(map);
                }
            })
            .catch(e => console.error("Telemetry fetch failed", e));

        // Status & Detections
        fetch('/api/status')
            .then(res => res.json())
            .then(data => {
                // Weather
                if (data.weather) {
                    document.getElementById('val-temp').innerText = data.weather.temp + "°C";
                    document.getElementById('val-wind').innerText = data.weather.wind_speed + " km/h";
                }

                // Detections
                data.detections.forEach(det => {
                    const id = det.timestamp;
                    if (!existingDetections.has(id)) {
                        existingDetections.add(id);

                        // Marker
                        L.circleMarker([det.lat, det.lon], {
                            radius: 6,
                            fillColor: '#00ff9d',
                            color: '#00ff9d',
                            weight: 1,
                            fillOpacity: 0.8
                        }).bindPopup("Humus Verified").addTo(map);

                        // Notif & Voice
                        addNotification(det.lat, det.lon, det.timestamp);
                        jarvis.speak("Organic material detected.");
                    }
                });
            })
            .catch(e => console.error("Status fetch failed", e));
    }

    // Start Polling
    setInterval(updateDashboard, 1000);

    // Clock
    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString();
    }, 1000);

});
