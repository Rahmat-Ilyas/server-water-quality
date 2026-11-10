const express = require('express');
const { waterDb } = require('../config/db');
const simulator = require('../services/simulator');

const router = express.Router();

// Ambil kondisi terakhir langsung
router.get('/water-current', (req, res) => {
  res.json(simulator.getCurrentState());
});

// Ambil riwayat dengan filter waktu
router.get('/water-history', (req, res) => {
  const filter = req.query.filter || 'last20';

  if (filter === 'last20') {
    waterDb.find({}).sort({ timestamp: -1 }).limit(20).exec((err, docs) => {
      if (err) return res.status(500).json({ error: "Gagal mengambil data" });
      return res.json(docs.reverse());
    });
    return;
  }

  let hoursToSubtract = 1;
  let intervalMs = 60 * 1000; // 1 menit

  if (filter === '1h') {
    hoursToSubtract = 1;
    intervalMs = 60 * 1000;
  } else if (filter === '4h') {
    hoursToSubtract = 4;
    intervalMs = 5 * 60 * 1000;
  } else if (filter === '24h') {
    hoursToSubtract = 24;
    intervalMs = 30 * 60 * 1000;
  }

  const timeAgo = Date.now() - (hoursToSubtract * 60 * 60 * 1000);

  waterDb.find({ timestamp: { $gte: timeAgo } }).sort({ timestamp: 1 }).exec((err, docs) => {
    if (err) return res.status(500).json({ error: "Gagal mengambil riwayat data" });
    if (docs.length === 0) return res.json([]);

    const grouped = {};
    docs.forEach(doc => {
      const bucket = Math.floor(doc.timestamp / intervalMs) * intervalMs;
      if (!grouped[bucket]) {
        grouped[bucket] = {
          count: 0,
          sumSuhu: 0,
          sumPh: 0,
          sumDo: 0,
          sumTds: 0,
          sumTurbidity: 0
        };
      }
      grouped[bucket].count += 1;
      grouped[bucket].sumSuhu += doc.suhu;
      grouped[bucket].sumPh += doc.ph;
      grouped[bucket].sumDo += doc.do;
      grouped[bucket].sumTds += doc.tds;
      grouped[bucket].sumTurbidity += doc.turbidity;
    });

    const aggregated = Object.keys(grouped).map(bucketKey => {
      const g = grouped[bucketKey];
      return {
        timestamp: parseInt(bucketKey),
        suhu: parseFloat((g.sumSuhu / g.count).toFixed(1)),
        ph: parseFloat((g.sumPh / g.count).toFixed(2)),
        do: parseFloat((g.sumDo / g.count).toFixed(2)),
        tds: Math.round(g.sumTds / g.count),
        turbidity: parseFloat((g.sumTurbidity / g.count).toFixed(2))
      };
    }).sort((a, b) => a.timestamp - b.timestamp);

    res.json(aggregated);
  });
});

module.exports = router;

