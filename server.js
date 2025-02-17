require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully:', res.rows[0]);
  }
});

// Validation middleware
const validateTransaction = (req, res, next) => {
  const { type, amount, description, interest_rate } = req.body;

  if (!type || !['asset', 'liability'].includes(type)) {
    return res.status(400).json({ error: 'Type must be either "asset" or "liability"' });
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Description is required and must be a string' });
  }

  if (!interest_rate || isNaN(interest_rate) || interest_rate <= 0) {
    return res.status(400).json({ error: 'Interest rate must be a non-negative number' });
  }

  next();
};

// CRUD endpoints
app.get('/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/transactions', validateTransaction, async (req, res) => {
  const { type, amount, description, interest_rate } = req.body;
  console.log('Received transaction data:', req.body);
  try {
    const result = await pool.query(
      'INSERT INTO transactions (type, amount, description, interest_rate) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, amount, description, interest_rate]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.put('/transactions/:id', validateTransaction, async (req, res) => {
  const { id } = req.params;
  const { type, amount, description, interest_rate } = req.body;
  try {
    const result = await pool.query(
      'UPDATE transactions SET type = $1, amount = $2, description = $3, interest_rate = $4 WHERE id = $5 RETURNING *',
      [type, amount, description, interest_rate, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

app.delete('/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted', deletedTransaction: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Transfer rate calculation endpoint
app.get('/transfer-rate', async (req, res) => {
  try {
    // Fetch all liabilities
    const liabilitiesResult = await pool.query(
      "SELECT amount, interest_rate FROM transactions WHERE type = 'liability'"
    );
    const liabilities = liabilitiesResult.rows;

    if (liabilities.length === 0) {
        return res.json({ transferRate: 0 });
    }

    // Calculate weighted average cost of liabilities
    const totalLiabilities = liabilities.reduce((sum, liab) => sum + parseFloat(liab.amount), 0);
    const weightedCost = liabilities.reduce(
      (sum, liab) => sum + parseFloat(liab.amount) * parseFloat(liab.interest_rate) /100,
      0
    );
    const transferRate = weightedCost / totalLiabilities;


    res.json({ transferRate });
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate transfer rate' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Transfer Pricing App!');
});

// Start the server
const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



//TODO: Get rid of id and date in front end, add maturity (def to NMA), risk, sector
