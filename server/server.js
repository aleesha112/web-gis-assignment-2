// Parks and Recreational Facilities - backend API (Node.js + Express + PostgreSQL/PostGIS)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection settings come from the .env file (never hard-code passwords)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'parks_gis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Allowed values (they match the CHECK constraints in the SQL script)
const FACILITY_TYPES = ['Park', 'Playground', 'Walking Track', 'Sports Ground'];
const CONDITIONS = ['Good', 'Fair', 'Poor'];
const CITIES = ['Islamabad', 'Rawalpindi'];

// Rough bounding box around Islamabad and Rawalpindi
const BOUNDS = { minLat: 33.4, maxLat: 33.9, minLng: 72.8, maxLng: 73.4 };

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Validate and clean the data sent from the website form
function validatePark(body) {
  const errors = [];
  const name = String(body.name || '').trim();
  const facilityType = String(body.facility_type || '').trim();
  const city = String(body.city || '').trim();
  const area = String(body.area || '').trim();
  const openingHours = String(body.opening_hours || '').trim();
  const amenities = String(body.amenities || '').trim();
  const condition = String(body.condition || 'Good').trim();
  const dataSource = String(body.data_source || 'Added via website').trim();
  const entryFee = body.entry_fee === '' || body.entry_fee == null ? 0 : Number(body.entry_fee);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!name) errors.push('Name is required.');
  if (name.length > 150) errors.push('Name must be 150 characters or fewer.');
  if (!FACILITY_TYPES.includes(facilityType)) errors.push('Facility type must be one of: ' + FACILITY_TYPES.join(', ') + '.');
  if (!CITIES.includes(city)) errors.push('City must be Islamabad or Rawalpindi.');
  if (!CONDITIONS.includes(condition)) errors.push('Condition must be one of: ' + CONDITIONS.join(', ') + '.');
  if (Number.isNaN(entryFee) || entryFee < 0 || entryFee > 100000) errors.push('Entry fee must be a number between 0 and 100000.');
  if (area.length > 100) errors.push('Area must be 100 characters or fewer.');
  if (openingHours.length > 50) errors.push('Opening hours must be 50 characters or fewer.');
  if (body.lat === '' || body.lat == null || body.lng === '' || body.lng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
    errors.push('Latitude and longitude are required and must be numbers.');
  } else if (lat < BOUNDS.minLat || lat > BOUNDS.maxLat || lng < BOUNDS.minLng || lng > BOUNDS.maxLng) {
    errors.push('Location must be inside the Islamabad/Rawalpindi area.');
  }

  return {
    errors,
    value: { name, facilityType, city, area, entryFee, openingHours, amenities, condition, dataSource, lat, lng },
  };
}

// Convert a database row to a GeoJSON feature
function rowToFeature(row) {
  const { lat, lng, ...properties } = row;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lng, lat] },
    properties,
  };
}

const SELECT_FIELDS = `id, name, facility_type, city, area, entry_fee, opening_hours,
  amenities, condition, data_source, ST_X(geom) AS lng, ST_Y(geom) AS lat`;

function parseId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid record id.' });
    return null;
  }
  return id;
}

// GET /api/parks?city=&facility_type=&condition=&search=
app.get('/api/parks', asyncHandler(async (req, res) => {
  const conditions = [];
  const params = [];

  if (req.query.city) {
    params.push(req.query.city);
    conditions.push(`city = $${params.length}`);
  }
  if (req.query.facility_type) {
    params.push(req.query.facility_type);
    conditions.push(`facility_type = $${params.length}`);
  }
  if (req.query.condition) {
    params.push(req.query.condition);
    conditions.push(`condition = $${params.length}`);
  }
  if (req.query.search) {
    params.push(`%${req.query.search}%`);
    conditions.push(`(name ILIKE $${params.length} OR area ILIKE $${params.length})`);
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const result = await pool.query(`SELECT ${SELECT_FIELDS} FROM parks ${where} ORDER BY id`, params);

  res.json({ type: 'FeatureCollection', features: result.rows.map(rowToFeature) });
}));

// GET /api/stats - record counts by city and facility type
app.get('/api/stats', asyncHandler(async (req, res) => {
  const result = await pool.query(
    `SELECT city, facility_type, COUNT(*)::int AS total
     FROM parks GROUP BY city, facility_type ORDER BY city, facility_type`
  );
  res.json(result.rows);
}));

// GET /api/parks/:id
app.get('/api/parks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const result = await pool.query(`SELECT ${SELECT_FIELDS} FROM parks WHERE id = $1`, [id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found.' });
  res.json(rowToFeature(result.rows[0]));
}));

// POST /api/parks - add a new record
app.post('/api/parks', asyncHandler(async (req, res) => {
  const { errors, value: v } = validatePark(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });

  const result = await pool.query(
    `INSERT INTO parks (name, facility_type, city, area, entry_fee, opening_hours, amenities, condition, data_source, geom)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ST_SetSRID(ST_MakePoint($10, $11), 4326))
     RETURNING ${SELECT_FIELDS}`,
    [v.name, v.facilityType, v.city, v.area, v.entryFee, v.openingHours, v.amenities, v.condition, v.dataSource, v.lng, v.lat]
  );
  res.status(201).json(rowToFeature(result.rows[0]));
}));

// PUT /api/parks/:id - update an existing record
app.put('/api/parks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const { errors, value: v } = validatePark(req.body);
  if (errors.length) return res.status(400).json({ error: 'Validation failed.', details: errors });

  const result = await pool.query(
    `UPDATE parks SET name = $1, facility_type = $2, city = $3, area = $4, entry_fee = $5,
       opening_hours = $6, amenities = $7, condition = $8, data_source = $9,
       geom = ST_SetSRID(ST_MakePoint($10, $11), 4326)
     WHERE id = $12
     RETURNING ${SELECT_FIELDS}`,
    [v.name, v.facilityType, v.city, v.area, v.entryFee, v.openingHours, v.amenities, v.condition, v.dataSource, v.lng, v.lat, id]
  );
  if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found.' });
  res.json(rowToFeature(result.rows[0]));
}));

// DELETE /api/parks/:id - optional extra feature
app.delete('/api/parks/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;
  const result = await pool.query('DELETE FROM parks WHERE id = $1', [id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Record not found.' });
  res.json({ message: 'Record deleted.' });
}));

// Unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found.' }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof SyntaxError && err.status === 400) {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }
  res.status(500).json({ error: 'Server error. Please try again.' });
});

// Check the database connection, then start the server
pool.query('SELECT 1')
  .then(() => {
    app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Could not connect to PostgreSQL:', err.message);
    process.exit(1);
  });