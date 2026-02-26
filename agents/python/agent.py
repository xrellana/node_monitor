# agent.py - An enhanced server monitoring agent with comprehensive metrics.

from flask import Flask, jsonify
from flask_cors import CORS
import psutil
import time
import subprocess
import json
import platform

try:
    import GPUtil
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False

# Initialize the Flask application
app = Flask(__name__)
# Enable Cross-Origin Resource Sharing (CORS) to allow browser requests
CORS(app)

def get_gpu_usage():
    """Get GPU usage statistics."""
    if not GPU_AVAILABLE:
        return {"available": False, "error": "GPUtil not installed or no GPU found"}
    
    try:
        gpus = GPUtil.getGPUs()
        if not gpus:
            return {"available": False, "error": "No GPUs detected"}
        
        gpu_data = []
        for gpu in gpus:
            gpu_data.append({
                "id": gpu.id,
                "name": gpu.name,
                "load": gpu.load * 100,
                "memory_used": gpu.memoryUsed,
                "memory_total": gpu.memoryTotal,
                "memory_percent": (gpu.memoryUsed / gpu.memoryTotal) * 100,
                "temperature": gpu.temperature
            })
        return {"available": True, "gpus": gpu_data}
    except Exception as e:
        return {"available": False, "error": str(e)}

def get_network_stats():
    """Get network interface statistics."""
    try:
        # Get initial network stats
        net_io_start = psutil.net_io_counters(pernic=True)
        time.sleep(1)  # Wait 1 second for rate calculation
        net_io_end = psutil.net_io_counters(pernic=True)
        
        network_data = {}
        for interface, end_stats in net_io_end.items():
            if interface in net_io_start:
                start_stats = net_io_start[interface]
                
                # Calculate rates (bytes per second)
                bytes_sent_rate = end_stats.bytes_sent - start_stats.bytes_sent
                bytes_recv_rate = end_stats.bytes_recv - start_stats.bytes_recv
                
                # Convert to Mbps
                sent_mbps = round((bytes_sent_rate * 8) / (1024 * 1024), 2)
                recv_mbps = round((bytes_recv_rate * 8) / (1024 * 1024), 2)
                
                network_data[interface] = {
                    "sent_mbps": sent_mbps,
                    "recv_mbps": recv_mbps,
                    "bytes_sent": end_stats.bytes_sent,
                    "bytes_recv": end_stats.bytes_recv,
                    "packets_sent": end_stats.packets_sent,
                    "packets_recv": end_stats.packets_recv,
                    "errors": end_stats.errout + end_stats.errin,
                    "dropped": end_stats.dropout + end_stats.dropin
                }
        
        return network_data
    except Exception as e:
        return {"error": str(e)}

@app.route('/metrics')
def get_metrics():
    """
    Enhanced metrics endpoint providing comprehensive system information.
    """
    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()
    cpu_load = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
    
    # Memory metrics
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    # Disk metrics
    disk = psutil.disk_usage('/')
    disk_io = psutil.disk_io_counters()
    
    # Network metrics
    network_stats = get_network_stats()
    
    # GPU metrics
    gpu_stats = get_gpu_usage()
    
    # System info
    boot_time = psutil.boot_time()
    uptime_seconds = time.time() - boot_time
    
    # Create comprehensive metrics dictionary
    metrics = {
        'timestamp': time.time(),
        'system': {
            'platform': platform.platform(),
            'hostname': platform.node(),
            'uptime_seconds': int(uptime_seconds),
            'boot_time': boot_time
        },
        'cpu': {
            'percent': cpu_percent,
            'count': cpu_count,
            'frequency_mhz': cpu_freq.current if cpu_freq else None,
            'load_average': {
                '1min': cpu_load[0] if cpu_load else None,
                '5min': cpu_load[1] if cpu_load else None,
                '15min': cpu_load[2] if cpu_load else None
            }
        },
        'memory': {
            'total_gb': round(mem.total / (1024**3), 2),
            'used_gb': round(mem.used / (1024**3), 2),
            'available_gb': round(mem.available / (1024**3), 2),
            'percent': mem.percent,
            'swap_total_gb': round(swap.total / (1024**3), 2),
            'swap_used_gb': round(swap.used / (1024**3), 2),
            'swap_percent': swap.percent
        },
        'disk': {
            'total_gb': round(disk.total / (1024**3), 2),
            'used_gb': round(disk.used / (1024**3), 2),
            'free_gb': round(disk.free / (1024**3), 2),
            'percent': disk.percent,
            'disk_io': {
                'read_mb': round(disk_io.read_bytes / (1024**2), 2) if disk_io else None,
                'write_mb': round(disk_io.write_bytes / (1024**2), 2) if disk_io else None
            }
        },
        'network': network_stats,
        'gpu': gpu_stats
    }

    return jsonify(metrics)

if __name__ == '__main__':
    # Run the app on host 0.0.0.0 to make it accessible
    # from other machines on your network.
    # You can change the port if needed.
    app.run(host='0.0.0.0', port=5000)