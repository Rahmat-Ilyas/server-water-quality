// Inisialisasi Socket.IO
const socket = io();

// DOM Elements
const valSuhu = document.getElementById('valSuhu');
const valPh = document.getElementById('valPh');
const valDo = document.getElementById('valDo');
const valTds = document.getElementById('valTds');
const valTurbidity = document.getElementById('valTurbidity');

const barSuhu = document.getElementById('barSuhu');
const barPh = document.getElementById('barPh');
const barDo = document.getElementById('barDo');
const barTds = document.getElementById('barTds');
const barTurbidity = document.getElementById('barTurbidity');

const overallStatusText = document.getElementById('overallStatusText');
const lastUpdateTime = document.getElementById('lastUpdateTime');
const tableBody = document.getElementById('tableBody');
const timeFilter = document.getElementById('timeFilter');

// Inisialisasi Chart.js
const ctx = document.getElementById('waterChart').getContext('2d');
const waterChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [
      {
        label: 'Suhu (°C)',
        data: [],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'pH',
        data: [],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'DO (mg/L)',
        data: [],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'Turbidity (NTU)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        yAxisID: 'y'
      },
      {
        label: 'TDS (ppm) [Sumbu Kanan]',
        data: [],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.3,
        yAxisID: 'y1'
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(148, 163, 184, 0.2)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Suhu / pH / DO / Turbidity',
          color: '#94a3b8',
          font: { size: 11 }
        },
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        min: 0,
        max: 35
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'TDS (ppm)',
          color: '#f59e0b',
          font: { size: 11 }
        },
        ticks: { color: '#f59e0b' },
        grid: { drawOnChartArea: false },
        min: 100,
        max: 400
      }
    }
  }
});

// Helper persentase bar
function calcPercent(val, min, max) {
  const p = ((val - min) / (max - min)) * 100;
  return Math.min(Math.max(p, 5), 100);
}

// Render isi tabel
function renderTable(dataArray) {
  if (!dataArray || dataArray.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 20px;">Belum ada data sensor.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  // Tampilkan data paling baru di atas
  const reversed = [...dataArray].reverse();

  reversed.forEach(item => {
    const tr = document.createElement('tr');
    const dt = new Date(item.timestamp);
    const timeStr = dt.toLocaleTimeString('id-ID');

    // Tentukan badge status
    let statusBadge = '<span class="badge-status-table badge-table-success">Sangat Baik</span>';
    if (item.evaluation && item.evaluation.statusText) {
      const st = item.evaluation.statusText;
      if (st === 'KURANG BAIK') {
        statusBadge = '<span class="badge-status-table badge-table-danger">Kurang Baik</span>';
      } else if (st === 'BAIK') {
        statusBadge = '<span class="badge-status-table badge-table-warning">Baik</span>';
      }
    }

    tr.innerHTML = `
      <td>${timeStr}</td>
      <td style="color: var(--color-suhu); font-weight:600;">${item.suhu.toFixed(1)} °C</td>
      <td style="color: var(--color-ph); font-weight:600;">${item.ph.toFixed(2)}</td>
      <td style="color: var(--color-do); font-weight:600;">${item.do.toFixed(2)} mg/L</td>
      <td style="color: var(--color-tds); font-weight:600;">${item.tds} ppm</td>
      <td style="color: var(--color-turbidity); font-weight:600;">${item.turbidity.toFixed(2)} NTU</td>
      <td>${statusBadge}</td>
    `;
    tableBody.appendChild(tr);
  });
}

// Fetch Riwayat via REST API
async function fetchHistory() {
  try {
    const filter = timeFilter.value;
    const res = await fetch(`/api/water-history?filter=${filter}`);
    const data = await res.json();

    const labels = data.map(d => {
      const dt = new Date(d.timestamp);
      if (filter === '24h') {
        return dt.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      }
      return dt.toLocaleTimeString('id-ID');
    });

    waterChart.data.labels = labels;
    waterChart.data.datasets[0].data = data.map(d => d.suhu);
    waterChart.data.datasets[1].data = data.map(d => d.ph);
    waterChart.data.datasets[2].data = data.map(d => d.do);
    waterChart.data.datasets[3].data = data.map(d => d.turbidity);
    waterChart.data.datasets[4].data = data.map(d => d.tds);
    waterChart.update();

    renderTable(data);
  } catch (err) {
    console.error("Gagal memuat histori data:", err);
  }
}

// Listen Socket.io Real-time
socket.on('water_reading', (data) => {
  // Update Kartu Angka
  valSuhu.textContent = data.suhu.toFixed(1);
  valPh.textContent = data.ph.toFixed(2);
  valDo.textContent = data.do.toFixed(2);
  valTds.textContent = data.tds;
  valTurbidity.textContent = data.turbidity.toFixed(2);

  // Update Progress Bars
  barSuhu.style.width = calcPercent(data.suhu, 24, 32) + '%';
  barPh.style.width = calcPercent(data.ph, 6.0, 8.5) + '%';
  barDo.style.width = calcPercent(data.do, 3.0, 9.0) + '%';
  barTds.style.width = calcPercent(data.tds, 100, 450) + '%';
  barTurbidity.style.width = calcPercent(data.turbidity, 0.5, 8.0) + '%';

  // Overall Status
  if (data.evaluation) {
    overallStatusText.textContent = data.evaluation.statusText;
    if (data.evaluation.badgeColor === 'success') {
      overallStatusText.style.color = '#34d399';
    } else if (data.evaluation.badgeColor === 'warning') {
      overallStatusText.style.color = '#fbbf24';
    } else {
      overallStatusText.style.color = '#f87171';
    }
  }

  const now = new Date();
  lastUpdateTime.textContent = now.toLocaleTimeString('id-ID');

  // Jika sedang mode 'last20', streaming langsung ke grafik & tabel
  if (timeFilter.value === 'last20') {
    const timeLabel = now.toLocaleTimeString('id-ID');
    waterChart.data.labels.push(timeLabel);
    waterChart.data.datasets[0].data.push(data.suhu);
    waterChart.data.datasets[1].data.push(data.ph);
    waterChart.data.datasets[2].data.push(data.do);
    waterChart.data.datasets[3].data.push(data.turbidity);
    waterChart.data.datasets[4].data.push(data.tds);

    if (waterChart.data.labels.length > 20) {
      waterChart.data.labels.shift();
      waterChart.data.datasets[0].data.shift();
      waterChart.data.datasets[1].data.shift();
      waterChart.data.datasets[2].data.shift();
      waterChart.data.datasets[3].data.shift();
      waterChart.data.datasets[4].data.shift();
    }
    waterChart.update('none'); // update tanpa re-render animasi berat

    // Ambil ulang tabel histori
    fetchHistory();
  }
});

// Event Listener
timeFilter.addEventListener('change', fetchHistory);

// Load awal
window.addEventListener('load', () => {
  fetchHistory();
});

