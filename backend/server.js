const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Database connection setup (We will configure this in k8s)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'habits_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Create tables if they do not exist
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        start_date VARCHAR(255),
        end_date VARCHAR(255)
      );
    `);
    
    // For simplicity, we just store the day data as JSON in a single table row per date
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracker_data (
        date VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);
    console.log("Database initialized");
  } catch (error) {
    console.error("Database init error:", error);
  }
}

// Ensure connection works and init schema
pool.connect()
  .then(() => {
    console.log('Connected to PostgreSQL');
    initDb();
  })
  .catch(err => console.error('Connection error', err.stack));

// --- HABITS API ---
app.get('/api/habits', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM habits');
    // Transform snake_case back to camelCase for frontend
    const habits = result.rows.map(r => ({
      id: r.id, 
      name: r.name, 
      startDate: r.start_date, 
      endDate: r.end_date
    }));
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/habits', async (req, res) => {
  try {
    const { id, name, startDate, endDate } = req.body;
    await pool.query(
      'INSERT INTO habits (id, name, start_date, end_date) VALUES ($1, $2, $3, $4)',
      [id, name, startDate, endDate]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/habits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM habits WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRACKER DATA API ---
app.get('/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tracker_data');
    // Transform array of rows into the Record<string, DayData> dictionary format the frontend expects
    const dataDict = {};
    result.rows.forEach(row => {
      dataDict[row.date] = row.data;
    });
    res.json(dataDict);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Saves the entire state. In a real app we'd just update the specific day, but this is simple migration.
app.post('/api/data', async (req, res) => {
  try {
    const trackerDataObj = req.body; // Expecting the full dictionary
    // Upsert each day into the database
    for (const [date, dayData] of Object.entries(trackerDataObj)) {
      await pool.query(
        `INSERT INTO tracker_data (date, data) 
         VALUES ($1, $2) 
         ON CONFLICT (date) DO UPDATE SET data = $2`,
        [date, dayData]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Readiness/Liveness Probe Endpoint for Kubernetes
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
