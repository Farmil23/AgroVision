from flask import Flask, render_template, jsonify, request
from flask_cors import CORS

# CLIENT-SIDE SIMULATION ARCHITECTURE
# The logic has been moved to dashboard.js for Vercel compatibility.
# This Flask app now serves only as a static host + API shell.

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return render_template('index.html')

# Mock APIs (Optional, but kept for potential future expansion)
@app.route('/api/status')
def get_status():
    return jsonify({"status": "active", "mode": "client-side"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
