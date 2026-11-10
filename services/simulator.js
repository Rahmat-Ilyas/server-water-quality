const { waterDb } = require('../config/db');

let ioInstance = null;

// Nilai dasar awal (State)
let state = {
  suhu: 27.4,       // °C
  ph: 7.22,         // pH
  do: 6.45,         // mg/L (Dissolved Oxygen)
  tds: 228,         // ppm
  turbidity: 2.85   // NTU
};

// Target pusat dan rentang acuan
const targets = {
  suhu: { center: 27.5, min: 26.0, max: 29.5, maxDelta: 0.15, decimals: 1 },
  ph: { center: 7.25, min: 6.80, max: 7.60, maxDelta: 0.04, decimals: 2 },
  do: { center: 6.50, min: 5.50, max: 7.50, maxDelta: 0.08, decimals: 2 },
  tds: { center: 230, min: 150, max: 320, maxDelta: 4.0, decimals: 0 },
  turbidity: { center: 2.8, min: 1.5, max: 5.0, maxDelta: 0.12, decimals: 2 }
};

/**
 * Evaluasi status kualitas air berdasarkan parameter fisik
 */
function evaluateStatus(data) {
  let score = 100;
  const issues = [];

  // Pengecekan ambang batas
  if (data.ph < 6.8 || data.ph > 7.6) {
    score -= 25;
    issues.push('pH di luar rentang ideal');
  }
  if (data.do < 5.5) {
    score -= 25;
    issues.push('DO terlalu rendah');
  }
  if (data.turbidity > 5.0) {
    score -= 20;
    issues.push('Kekeruhan di atas standar');
  }
  if (data.tds > 320) {
    score -= 15;
    issues.push('TDS tinggi');
  }

  let statusText = 'SANGAT BAIK';
  let badgeColor = 'success'; // success, warning, danger

  if (score < 60) {
    statusText = 'KURANG BAIK';
    badgeColor = 'danger';
  } else if (score < 85) {
    statusText = 'BAIK';
    badgeColor = 'warning';
  } else {
    statusText = 'SANGAT BAIK';
    badgeColor = 'success';
  }

  return { score, statusText, badgeColor, issues };
}

/**
 * Menghasilkan fluktuasi data baru secara halus (Smooth Random Walk dengan Mean Reversion)
 */
function generateNextReading() {
  for (const key of Object.keys(targets)) {
    const cfg = targets[key];
    const current = state[key];

    // Delta acak kecil
    const randomStep = (Math.random() - 0.5) * 2 * cfg.maxDelta;
    // Efek gravitasi ke titik tengah (agar tetap di rentang realistis)
    const pullToCenter = (cfg.center - current) * 0.08;

    let nextVal = current + randomStep + pullToCenter;

    // Batasan aman (Clamping)
    if (nextVal < cfg.min) nextVal = cfg.min;
    if (nextVal > cfg.max) nextVal = cfg.max;

    state[key] = parseFloat(nextVal.toFixed(cfg.decimals));
  }

  const evaluation = evaluateStatus(state);

  return {
    ...state,
    evaluation,
    timestamp: Date.now()
  };
}

/**
 * Inisialisasi simulator dan interval loop
 */
function init(io) {
  ioInstance = io;

  // Jalankan simulator setiap 3 detik
  setInterval(() => {
    const reading = generateNextReading();

    // Simpan ke NeDB
    waterDb.insert(reading, (err) => {
      if (err) console.error("Gagal menyimpan data water:", err);
    });

    // Broadcast ke semua browser via WebSocket
    if (ioInstance) {
      ioInstance.emit('water_reading', reading);
    }
  }, 3000);

  console.log("🌊 Simulator Kualitas Air aktif (Interval 3 detik).");
}

function getCurrentState() {
  return {
    ...state,
    evaluation: evaluateStatus(state),
    timestamp: Date.now()
  };
}

module.exports = {
  init,
  getCurrentState
};

