// dashboard.js - Modern server monitoring dashboard with dynamic endpoints

class ServerMonitor {
    constructor() {
        this.servers = new Map();
        this.updateInterval = 3000;
        this.updateTimer = null;
        this.init();
    }

    init() {
        this.loadServers();
        this.setupEventListeners();
        this.startMonitoring();
    }

    loadServers() {
        const saved = localStorage.getItem('monitoringServers');
        if (saved) {
            const servers = JSON.parse(saved);
            servers.forEach(server => this.addServer(server.name, server.url));
        }
    }

    saveServers() {
        const servers = Array.from(this.servers.values()).map(s => ({
            name: s.name,
            url: s.url
        }));
        localStorage.setItem('monitoringServers', JSON.stringify(servers));
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-server-btn');
        const modal = document.getElementById('add-server-modal');
        const closeBtn = modal.querySelector('.close');
        const form = document.getElementById('add-server-form');

        addBtn.addEventListener('click', () => modal.classList.add('show'));
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('show');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('server-name').value.trim();
            const url = document.getElementById('server-url').value.trim();

            if (name && url) {
                this.addServer(name, url);
                this.saveServers();
                modal.classList.remove('show');
                form.reset();
            }
        });
    }

    addServer(name, url) {
        if (this.servers.has(name)) {
            this.removeServer(name);
        }

        const serverCard = this.createServerCard(name, url);
        document.getElementById('servers-container').appendChild(serverCard);

        this.servers.set(name, {
            name: name,
            url: url,
            element: serverCard,
            lastUpdate: null
        });
    }

    removeServer(name) {
        const server = this.servers.get(name);
        if (server) {
            server.element.remove();
            this.servers.delete(name);
            this.saveServers();
        }
    }

    createServerCard(name, url) {
        const card = document.createElement('div');
        card.className = 'server-card';
        card.innerHTML = `
            <div class="server-header">
                <h3>${name}</h3>
                <button class="remove-btn" onclick="monitor.removeServer('${name}')">×</button>
            </div>
            <div class="server-url">${url}</div>
            <div class="metrics-grid">
                <!-- CPU -->
                <div class="metric-item">
                    <div class="metric-header">
                        <span class="metric-label">CPU Usage</span>
                        <span class="metric-value" data-metric="cpu-percent">--</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" data-metric="cpu-percent-fill"></div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Load Average (1/5/15m)</div>
                    <div class="details-text load-average">
                        <span data-metric="load1">--</span>
                        <span data-metric="load5">--</span>
                        <span data-metric="load15">--</span>
                    </div>
                </div>

                <!-- Memory -->
                <div class="metric-item">
                    <div class="metric-header">
                        <span class="metric-label">Memory</span>
                        <span class="metric-value" data-metric="mem-percent">--</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" data-metric="mem-percent-fill"></div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Used / Total</div>
                    <div class="details-text">
                        <span data-metric="mem-used">--</span> /
                        <span data-metric="mem-total">--</span> GB
                    </div>
                </div>

                <!-- Disk -->
                <div class="metric-item">
                    <div class="metric-header">
                        <span class="metric-label">Disk</span>
                        <span class="metric-value" data-metric="disk-percent">--</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" data-metric="disk-percent-fill"></div>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Used / Total</div>
                    <div class="details-text">
                        <span data-metric="disk-used">--</span> /
                        <span data-metric="disk-total">--</span> GB
                    </div>
                </div>

                <!-- Network & Uptime -->
                <div class="metric-item">
                    <div class="metric-label">Network (Mbps)</div>
                    <div class="details-text network-stats">
                        <span>↑ <span data-metric="net_up">--</span></span>
                        <span>↓ <span data-metric="net_down">--</span></span>
                    </div>
                </div>
                <div class="metric-item">
                    <div class="metric-label">Uptime</div>
                    <div class="details-text">
                        <span data-metric="uptime">--</span>
                    </div>
                </div>

                <!-- GPU -->
                <div class="metric-item full-width" data-metric="gpu-container" style="display: none;">
                    <div class="metric-label">GPU</div>
                    <div class="details-text" data-metric="gpu-details">
                        <!-- GPU details will be added here -->
                    </div>
                </div>
            </div>
            <div class="last-update">Last update: <span data-metric="last-update">Never</span></div>
        `;
        return card;
    }

    async updateServerData(name, server) {
        try {
            const response = await fetch(server.url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.updateServerDisplay(name, data);
            server.lastUpdate = new Date();
        } catch (error) {
            console.error(`Failed to fetch ${name}:`, error);
            this.showError(name, error.message);
        }
    }

    updateServerDisplay(name, data) {
        const server = this.servers.get(name);
        if (!server) return;

        const updateProgress = (metric, value) => {
            const fill = server.element.querySelector(`[data-metric="${metric}-fill"]`);
            const valueSpan = server.element.querySelector(`[data-metric="${metric}"]`);

            if (fill && valueSpan) {
                const percentage = Math.min(Math.max(value, 0), 100);
                fill.style.width = `${percentage}%`;
                valueSpan.textContent = `${percentage.toFixed(1)}%`;

                fill.className = `progress-fill ${percentage > 85 ? 'critical' : percentage > 60 ? 'warning' : 'normal'}`;
            }
        };

        const updateText = (metric, value) => {
            const el = server.element.querySelector(`[data-metric="${metric}"]`);
            if (el) el.textContent = value;
        };

        // Uptime
        const uptimeDays = Math.floor(data.system.uptime_seconds / (3600 * 24));
        const uptimeHours = Math.floor((data.system.uptime_seconds % (3600 * 24)) / 3600);
        updateText('uptime', `${uptimeDays}d ${uptimeHours}h`);

        // CPU
        updateProgress('cpu-percent', data.cpu.percent);
        if (data.cpu.load_average['1min'] !== null) {
            updateText('load1', data.cpu.load_average['1min'].toFixed(2));
            updateText('load5', data.cpu.load_average['5min'].toFixed(2));
            updateText('load15', data.cpu.load_average['15min'].toFixed(2));
        }

        // Memory
        updateProgress('mem-percent', data.memory.percent);
        updateText('mem-used', data.memory.used_gb);
        updateText('mem-total', data.memory.total_gb);

        // Disk
        updateProgress('disk-percent', data.disk.percent);
        updateText('disk-used', data.disk.used_gb);
        updateText('disk-total', data.disk.total_gb);

        // Network
        const interfaces = Object.values(data.network);
        if (interfaces.length > 0 && !interfaces[0].error) {
            const totalSent = interfaces.reduce((sum, i) => sum + i.sent_mbps, 0);
            const totalRecv = interfaces.reduce((sum, i) => sum + i.recv_mbps, 0);
            updateText('net_up', totalSent.toFixed(1));
            updateText('net_down', totalRecv.toFixed(1));
        }

        // GPU
        const gpuContainer = server.element.querySelector('[data-metric="gpu-container"]');
        if (data.gpu.available && data.gpu.gpus?.length > 0) {
            gpuContainer.style.display = 'block';
            const gpuDetails = server.element.querySelector('[data-metric="gpu-details"]');
            gpuDetails.innerHTML = '';
            data.gpu.gpus.forEach(gpu => {
                const gpuEl = document.createElement('div');
                gpuEl.classList.add('gpu-item');
                gpuEl.innerHTML = `
                    <strong>${gpu.name}</strong>:
                    Load: <strong>${gpu.load.toFixed(1)}%</strong> |
                    Temp: <strong>${gpu.temperature}°C</strong> |
                    Mem: <strong>${(gpu.memory_used / 1024).toFixed(1)}/${(gpu.memory_total / 1024).toFixed(1)} GB</strong>
                `;
                gpuDetails.appendChild(gpuEl);
            });
        } else {
            gpuContainer.style.display = 'none';
        }

        // Last update time
        updateText('last-update', new Date().toLocaleTimeString());
    }

    showError(name, error) {
        const server = this.servers.get(name);
        if (!server) return;

        const lastUpdate = server.element.querySelector('[data-metric="last-update"]');
        lastUpdate.textContent = `Error: ${error}`;
        lastUpdate.style.color = '#ff4757';
    }

    async updateAllServers() {
        const promises = Array.from(this.servers.entries()).map(([name, server]) =>
            this.updateServerData(name, server)
        );
        await Promise.all(promises);
    }

    startMonitoring() {
        this.updateAllServers();
        this.updateTimer = setInterval(() => this.updateAllServers(), this.updateInterval);
    }

    stopMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }
}

// Initialize the monitor
const monitor = new ServerMonitor();
