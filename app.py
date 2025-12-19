from flask import Flask, render_template, jsonify, request
from flask_cors import CORS
import threading
import time
from simulation import DroneSimulator

app = Flask(__name__)
CORS(app)

# Initialize Simulator
simulator = DroneSimulator()

# Background thread to run simulation
def run_simulation():
    while True:
        simulator.update()
        time.sleep(1) # Update every second

sim_thread = threading.Thread(target=run_simulation, daemon=True)
sim_thread.start()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/telemetry')
def get_telemetry():
    return jsonify(simulator.get_state())

@app.route('/api/status')
def get_status():
    return jsonify(simulator.get_system_status())

@app.route('/api/control/spreader', methods=['POST'])
def toggle_spreader():
    data = request.json
    active = data.get('active', False)
    simulator.set_spreader(active)
    return jsonify({'status': 'success', 'spreader_active': active})

@app.route('/api/control/goto', methods=['POST'])
def goto_target():
    data = request.json
    lat = data.get('lat')
    lon = data.get('lon')
    if lat and lon:
        simulator.set_target(float(lat), float(lon))
        return jsonify({'status': 'success', 'target': {'lat': lat, 'lon': lon}})
    return jsonify({'status': 'error', 'message': 'Invalid coordinates'}), 400

@app.route('/api/export')
def export_data():
    # Generate CSV
    csv_data = "Timestamp,Latitude,Longitude\n"
    for det in simulator.humus_detections:
        csv_data += f"{det['timestamp']},{det['lat']},{det['lon']}\n"
    
    from flask import Response
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-disposition": "attachment; filename=humus_report.csv"}
    )

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
