# 🦅 AgroVision - Autonomous Drone Monitoring System

**AgroVision** is a next-generation Ground Control Station (GCS) designed for agricultural UAVs. It combines real-time telemetry monitoring with AI-driven soil analysis to optimize precision farming.

![Dashboard Preview](https://via.placeholder.com/800x450.png?text=AgroVision+Dashboard+Preview)

> **Status**: Prokimnas Portfolio Project  
> **Version**: 2.0 (Cyber Update)

## ✨ Key Features

### 🎮 Mission Control & Telemetry
- **Live Tracking**: Real-time drone position on dark-mode interactive storage.
- **Click-to-Fly**: Autonomous mission deployment via map interaction.
- **Auto-Lock Camera**: Toggleable camera tracking to follow the drone or explore freely.
- **Flight Data**: Live monitoring of Altitude, Speed (m/s), and Battery levels.

### 🧠 AI & Intelligence
- **Humus Detection**: Simulated AI vision detects organic rich soil (Humus) and logs coordinates.
- **JARVIS Voice Assistant**: Integrated Text-to-Speech engine provides vocal feedback for system status, targets found, and mission confirmations.
- **Weather Widget**: Real-time environmental monitoring (Temp & Wind Speed).

### 📊 Data & Reporting
- **Live Event Log**: Tracks all detection events in real-time.
- **CSV Export**: One-click download of soil data for offline analysis.

### 🎨 Cyber Interface
- **Glassmorphism Design**: Modern, semi-transparent UI with neon accents.
- **Responsive Layout**: Optimized for desktop monitoring.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.9+, Flask
- **Frontend**: HTML5, Modern CSS3 (Variables, Flexbox, Grid), Vanilla JavaScript
- **Mapping**: Leaflet.js + CartoDB Dark Matter Tiles
- **Icons**: Lucide Icons

---

## 🚀 Installation & Usage

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/agrovision.git
   cd agrovision
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Application**
   ```bash
   python app.py
   ```

4. **Access Dashboard**
   Open your browser and navigate to:  
   `http://localhost:5000`

---

## 🕹️ Controls

- **Auto Lock**: Click the "Padlock" icon on the map to toggle camera tracking.
- **Mission Mode**: Unlock the camera (FREE mode), then click anywhere on the map to set a new flight target.
- **Voice AI**: Click the "Microphone" icon in the header to mute/unmute voice feedback.
- **Spreader**: Toggle the "Spreader System" switch to simulate agricultural payload activation.

---

## 📷 Screenshots

*(Place your screenshots here)*

---

**Developed for PROKIMNAS Portfolio**
