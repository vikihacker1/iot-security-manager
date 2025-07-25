from flask import Flask, jsonify, render_template, request
import nmap

app = Flask(__name__)

def run_nmap_scan(target):
    """
    Performs a real Nmap scan.
    NOTE: This requires the nmap command-line tool to be installed on the system
    and the Python script to be run with sufficient privileges (e.g., sudo).
    """
    # Basic validation to prevent command injection. A real app should use more robust regex.
    if not target or not all(c in "0123456789./" for c in target):
        raise ValueError("Invalid target format")

    nm = nmap.PortScanner()
    try:
        # -sV: Probe open ports to determine service/version info
        # -O: Enable OS detection
        # -T4: Use a more aggressive timing template for faster scans
        nm.scan(hosts=target, arguments='-sV -O -T4')
    except nmap.PortScannerError as e:
        print(f"Nmap error: {e}")
        return {"error": "Nmap scan failed. Ensure Nmap is installed and you have correct permissions."}

    scan_results = {}
    for host in nm.all_hosts():
        vendor = "Unknown Vendor"
        if 'vendor' in nm[host] and nm[host]['vendor']:
            # Nmap returns a dictionary of MAC addresses to vendor names
            vendor = list(nm[host]['vendor'].values())[0]

        ports = []
        if 'tcp' in nm[host]:
            for port in nm[host]['tcp']:
                ports.append({
                    "port": port,
                    "service": nm[host]['tcp'][port].get('name', 'unknown')
                })
        
        scan_results[host] = {
            "vendor": vendor,
            "ports": ports
        }
    return scan_results

@app.route('/')
def index():
    """Renders the main HTML page from the templates folder."""
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def scan_network():
    """
    Receives a target from the frontend, performs the Nmap scan,
    and returns the results as JSON.
    """
    data = request.json
    target = data.get('target')
    if not target:
        return jsonify({"error": "Target not provided"}), 400
    
    print(f"Received scan request for target: {target}")
    results = run_nmap_scan(target)
    return jsonify(results)

if __name__ == '__main__':
    # For development only. Use a production WSGI server like Gunicorn for deployment.
    app.run(debug=True, port=5001)
