// WaveChat Network Diagnostics & WMC Latency Tester
document.addEventListener('DOMContentLoaded', async () => {
  const serverStatusBadge = document.getElementById('netServerStatus');
  const socketTransportBadge = document.getElementById('netSocketTransport');
  const serverIpBadge = document.getElementById('netServerIp');
  const serverPortBadge = document.getElementById('netServerPort');
  const connectedUsersCountEl = document.getElementById('netConnectedUsers');
  const lanUrlEl = document.getElementById('netLanUrl');
  const databaseModeEl = document.getElementById('netDatabaseMode');
  const allInterfacesTable = document.getElementById('netInterfacesTable');

  const pingBtn = document.getElementById('runPingTestBtn');
  const pingResultsContainer = document.getElementById('pingResultsContainer');
  const avgLatencyEl = document.getElementById('avgLatency');
  const minLatencyEl = document.getElementById('minLatency');
  const maxLatencyEl = document.getElementById('maxLatency');
  const packetLossEl = document.getElementById('packetLoss');

  // Fetch server network diagnostic data
  async function loadNetworkDiagnostics() {
    try {
      const res = await fetch('/api/network/info');
      const data = await res.json();

      if (data.success && data.server) {
        const s = data.server;
        if (serverStatusBadge) serverStatusBadge.textContent = s.status;
        if (socketTransportBadge) socketTransportBadge.textContent = s.socketTransport;
        if (serverIpBadge) serverIpBadge.textContent = s.primaryIp;
        if (serverPortBadge) serverPortBadge.textContent = s.serverPort;
        if (connectedUsersCountEl) connectedUsersCountEl.textContent = s.connectedClientsCount;
        if (lanUrlEl) {
          lanUrlEl.textContent = s.lanAccessUrl;
          lanUrlEl.href = s.lanAccessUrl;
        }
        if (databaseModeEl) databaseModeEl.textContent = s.databaseMode;

        // Render interfaces
        if (allInterfacesTable && s.allNetworkInterfaces) {
          allInterfacesTable.innerHTML = '';
          s.allNetworkInterfaces.forEach((iface) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><code>${iface.interface}</code></td>
              <td><span class="badge bg-light text-dark border">${iface.address}</span></td>
              <td><small class="text-muted">${iface.mac || 'N/A'}</small></td>
              <td>${iface.isInternal ? '<span class="badge bg-secondary">Loopback (Internal)</span>' : '<span class="badge bg-success">Wireless / LAN (Active)</span>'}</td>
            `;
            allInterfacesTable.appendChild(tr);
          });
        }
      }
    } catch (err) {
      console.error('Failed to load network info:', err);
    }
  }

  // Ping Latency Measurement
  let isTesting = false;
  if (pingBtn) {
    pingBtn.addEventListener('click', async () => {
      if (isTesting) return;
      isTesting = true;
      pingBtn.disabled = true;
      pingBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Transmitting TCP/IP Packets...';

      if (pingResultsContainer) pingResultsContainer.innerHTML = '';

      const latencies = [];
      const totalPackets = 5;

      for (let i = 1; i <= totalPackets; i++) {
        const startTime = performance.now();
        try {
          const res = await fetch('/api/network/ping?t=' + Date.now(), { cache: 'no-store' });
          const endTime = performance.now();
          const rtt = Math.round(endTime - startTime);
          latencies.push(rtt);

          if (pingResultsContainer) {
            const p = document.createElement('div');
            p.className = 'd-flex justify-content-between align-items-center py-1 border-bottom small';
            p.innerHTML = `
              <span><i class="bi bi-arrow-left-right text-primary me-2"></i> Packet #${i} (64 bytes) to Server</span>
              <span class="badge ${rtt < 30 ? 'bg-success' : rtt < 80 ? 'bg-warning' : 'bg-danger'}">RTT: ${rtt} ms</span>
            `;
            pingResultsContainer.appendChild(p);
          }
        } catch (e) {
          if (pingResultsContainer) {
            const p = document.createElement('div');
            p.className = 'py-1 text-danger small';
            p.textContent = `Packet #${i}: Request timed out / Dropped`;
            pingResultsContainer.appendChild(p);
          }
        }
        await new Promise((r) => setTimeout(r, 200));
      }

      // Compute statistics
      if (latencies.length > 0) {
        const min = Math.min(...latencies);
        const max = Math.max(...latencies);
        const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
        const loss = Math.round(((totalPackets - latencies.length) / totalPackets) * 100);

        if (avgLatencyEl) avgLatencyEl.textContent = `${avg} ms`;
        if (minLatencyEl) minLatencyEl.textContent = `${min} ms`;
        if (maxLatencyEl) maxLatencyEl.textContent = `${max} ms`;
        if (packetLossEl) packetLossEl.textContent = `${loss}%`;
      }

      isTesting = false;
      pingBtn.disabled = false;
      pingBtn.innerHTML = '<i class="bi bi-play-circle me-1"></i> Run Latency Test Again';
    });
  }

  // Initial load
  await loadNetworkDiagnostics();

  // Refresh every 5 seconds for live stats
  setInterval(loadNetworkDiagnostics, 5000);
});
