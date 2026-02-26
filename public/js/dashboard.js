class ServerMonitor {
    constructor() {
        this.servers = new Map();
        this.updateInterval = 10000;
        this.updateTimer = null;
        this.cardTemplate = document.getElementById('server-card-template');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadServers();
    }

    async loadServers() {
        try {
            const response = await fetch('/api/servers');
            const servers = await response.json();
            
            // 清空现有卡片和服务器映射
            this.stopMonitoring();
            const container = document.getElementById('servers-container');
            container.innerHTML = '';
            this.servers.clear();
            
            servers.forEach(server => {
                const card = this.addServerCard(server);
                this.servers.set(server.id, {
                    ...server,
                    element: card,
                    lastUpdate: null
                });
            });

            this.startMonitoring();
        } catch (error) {
            console.error('Failed to load servers:', error);
        }
    }

    addServerCard(server) {
        const card = this.createServerCard(server);
        document.getElementById('servers-container').appendChild(card);
        return card;
    }

    setupEventListeners() {
        const addBtn = document.getElementById('add-server-btn');
        const modal = document.getElementById('add-server-modal');
        const closeBtn = modal.querySelector('.close');
        const form = document.getElementById('add-server-form');

        addBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
        });
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('flex');
                modal.classList.add('hidden');
            }
        });

        form.addEventListener('submit', (e) => this.handleAddServer(e));
    }

    async handleAddServer(e) {
        e.preventDefault();
        const name = document.getElementById('server-name').value.trim();
        const url = document.getElementById('server-url').value.trim();

        if (name && url) {
            try {
                const response = await fetch('/api/servers', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ name, url })
                });

                if (response.ok) {
                    const newServer = await response.json();
                    const card = this.addServerCard(newServer);
                    this.servers.set(newServer.id, {
                        ...newServer,
                        element: card,
                        lastUpdate: null
                    });
                    if (!this.updateTimer) {
                        this.startMonitoring();
                    }

                    const modal = document.getElementById('add-server-modal');
                    modal.classList.remove('flex');
                    modal.classList.add('hidden');
                    e.target.reset();
                } else {
                    const error = await response.json();
                    alert(error.error || 'Failed to add server');
                }
            } catch (error) {
                console.error('Error adding server:', error);
                alert('Failed to add server');
            }
        }
    }

    createServerCard(server) {
        if (!this.cardTemplate) {
            throw new Error('Missing #server-card-template in page');
        }

        const card = this.cardTemplate.content.firstElementChild.cloneNode(true);
        card.setAttribute('data-server-id', server.id);
        card.querySelector('[data-field="server-name"]').textContent = server.name;
        card.querySelector('[data-field="server-url"]').textContent = server.url;

        const removeButton = card.querySelector('[data-action="remove-server"]');
        removeButton.addEventListener('click', () => this.removeServer(server.id));

        return card;
    }

    async removeServer(serverId) {
        if (!confirm('Are you sure you want to remove this server?')) {
            return;
        }

        try {
            const response = await fetch(`/api/servers/${serverId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                const server = this.servers.get(serverId);
                if (server) {
                    server.element.remove();
                    this.servers.delete(serverId);
                    if (this.servers.size === 0) {
                        this.stopMonitoring();
                    }
                }
            } else {
                alert('Failed to remove server');
            }
        } catch (error) {
            console.error('Error removing server:', error);
            alert('Failed to remove server');
        }
    }

    async updateServerData(serverId, server) {
        try {
            const response = await fetch(`/api/metrics/${serverId}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            this.updateServerDisplay(serverId, data);
            server.lastUpdate = new Date();
        } catch (error) {
            console.error(`Failed to fetch ${server.name}:`, error);
            this.showError(serverId, error.message);
        }
    }

    updateServerDisplay(serverId, data) {
        const server = this.servers.get(serverId);
        if (!server) return;

        const element = server.element;

        const updateProgress = (metric, value) => {
            const fill = element.querySelector(`[data-metric="${metric}-fill"]`);
            const valueSpan = element.querySelector(`[data-metric="${metric}"]`);

            if (fill && valueSpan) {
                const percentage = Math.min(Math.max(value, 0), 100);
                fill.style.width = `${percentage}%`;
                valueSpan.textContent = `${percentage.toFixed(1)}%`;

                fill.style.backgroundColor = percentage > 85
                    ? '#ef4444'
                    : percentage > 60
                        ? '#f59e0b'
                        : '#22c55e';
            }
        };

        const updateText = (metric, value) => {
            const el = element.querySelector(`[data-metric="${metric}"]`);
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

        // Swap
        if (data.memory.swap_percent !== undefined) {
            updateProgress('swap-percent', data.memory.swap_percent);
            updateText('swap-used', data.memory.swap_used_gb);
            updateText('swap-total', data.memory.swap_total_gb);
        }

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
        const gpuContainer = element.querySelector('[data-metric="gpu-container"]');
        if (data.gpu.available && data.gpu.gpus?.length > 0) {
            gpuContainer.classList.remove('hidden');
            gpuContainer.classList.add('flex');
            const gpuDetails = element.querySelector('[data-metric="gpu-details"]');
            gpuDetails.innerHTML = '';
            data.gpu.gpus.forEach(gpu => {
                const gpuEl = document.createElement('div');
                gpuEl.className = 'rounded-box bg-base-200 px-3 py-2 text-sm';
                gpuEl.textContent =
                    `${gpu.name}: Load ${gpu.load.toFixed(1)}% | ` +
                    `Temp ${gpu.temperature}°C | ` +
                    `Mem ${(gpu.memory_used / 1024).toFixed(1)}/${(gpu.memory_total / 1024).toFixed(1)} GB`;
                gpuDetails.appendChild(gpuEl);
            });
        } else {
            gpuContainer.classList.remove('flex');
            gpuContainer.classList.add('hidden');
        }

        // Last update time
        updateText('last-update', new Date().toLocaleTimeString());
        const lastUpdate = element.querySelector('[data-metric="last-update"]');
        if (lastUpdate) {
            lastUpdate.classList.remove('text-error');
        }
    }

    showError(serverId, error) {
        const server = this.servers.get(serverId);
        if (!server) return;

        const lastUpdate = server.element.querySelector('[data-metric="last-update"]');
        lastUpdate.textContent = `Error: ${error}`;
        lastUpdate.classList.add('text-error');
    }

    async updateAllServers() {
        const promises = Array.from(this.servers.entries()).map(([serverId, server]) =>
            this.updateServerData(serverId, server)
        );
        await Promise.all(promises);
    }

    startMonitoring() {
        if (!this.updateTimer && this.servers.size > 0) {
            this.updateAllServers();
            this.updateTimer = setInterval(() => this.updateAllServers(), this.updateInterval);
        }
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
