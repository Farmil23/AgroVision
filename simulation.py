import random
import math

class DroneSimulator:
    def __init__(self):
        # Initial State (Lat/Lon near a field in Indonesia loosely)
        self.lat = -6.2088 
        self.lon = 106.8456
        self.altitude = 0 # meters
        self.battery = 100 # percentage
        self.speed = 0 # m/s
        self.heading = 0 # degrees
        
        # System State
        self.spreader_active = False
        self.is_flying = True
        self.humus_detections = [] 
        self.mode = "LOITER"
        self.target_lat = None
        self.target_lon = None
        
        # Weather Sim
        self.weather = {
            "temp": 28,
            "wind_speed": 12,
            "condition": "Clear"
        }
        
        # Simulation Logic Helpers
        self.target_waypoints = []
        self.current_waypoint_index = 0
        self.tick_count = 0

    def update(self):
        self.tick_count += 1
        
        # Simulate Battery Drain
        if self.battery > 0:
            drain = 0.1 if not self.spreader_active else 0.3
            self.battery = max(0, self.battery - drain)

        # Navigation Logic
        if self.target_lat is not None and self.target_lon is not None:
            # Move towards target
            d_lat = self.target_lat - self.lat
            d_lon = self.target_lon - self.lon
            dist = math.sqrt(d_lat**2 + d_lon**2)
            
            if dist < 0.0001: # Reached target (roughly 10m)
                self.target_lat = None
                self.target_lon = None
                self.mode = "LOITER"
            else:
                self.mode = "MISSION"
                # Normalize and scale by speed
                speed_factor = 0.00015 # Approx speed
                self.lat += (d_lat / dist) * speed_factor
                self.lon += (d_lon / dist) * speed_factor
                # Calculate Heading
                self.heading = (math.degrees(math.atan2(d_lon, d_lat)) + 360) % 360
        else:
            # Default Loiter
            self.mode = "LOITER"
            self.lat += math.sin(self.tick_count * 0.1) * 0.00005
            self.lon += math.cos(self.tick_count * 0.1) * 0.00005
            self.heading = (self.heading + 1) % 360

        self.altitude = 50 + math.sin(self.tick_count * 0.05) * 5
        self.speed = 10 + random.uniform(-1, 1)

        # Simulate AI Detection (Rare event)
        if random.random() < 0.05: # 5% chance per tick
            self.humus_detections.append({
                "lat": self.lat + random.uniform(-0.0001, 0.0001),
                "lon": self.lon + random.uniform(-0.0001, 0.0001),
                "timestamp": self.tick_count
            })

    def get_state(self):
        return {
            "lat": self.lat,
            "lon": self.lon,
            "altitude": round(self.altitude, 2),
            "battery": round(self.battery, 1),
            "speed": round(self.speed, 1),
            "heading": self.heading,
            "spreader": self.spreader_active,
            "mode": self.mode
        }

    def get_system_status(self):
        return {
            "connection": "CONNECTED",
            "gps_satellites": 12,
            "detections": self.humus_detections[-5:], # Last 5 detections
            "weather": self.weather # Return weather data
        }

    def set_spreader(self, active):
        self.spreader_active = active

    def set_target(self, lat, lon):
        self.target_lat = lat
        self.target_lon = lon
