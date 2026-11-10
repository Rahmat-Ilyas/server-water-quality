const Datastore = require('@seald-io/nedb');
const path = require('path');

const waterDb = new Datastore({
  filename: path.join(__dirname, '../water_data.db'),
  autoload: true
});

// Indeks timestamp untuk kueri cepat
waterDb.ensureIndex({ fieldName: 'timestamp' }, (err) => {
  if (err) console.error("Gagal membuat indeks timestamp:", err);
});

module.exports = { waterDb };

