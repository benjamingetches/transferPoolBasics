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
    const { type, amount, description, interest_rate, risk, maturity } = req.body;
  
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
  
    if (risk && !['low', 'med', 'high'].includes(risk)) {
      return res.status(400).json({ error: 'Risk must be either "low", "med", or "high"' });
    }
  
    if (maturity && (isNaN(maturity) || maturity < 0)) {
      return res.status(400).json({ error: 'Maturity must be a non-negative number' });
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
    const { type, amount, description, interest_rate, risk, maturity } = req.body;
    console.log('Received transaction data:', req.body);
    try {
      const result = await pool.query(
        'INSERT INTO transactions (type, amount, description, interest_rate, risk, maturity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [type, amount, description, interest_rate, risk || 'low', maturity || 0]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Database error:', err);
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


app.get('/transactions/pool-by-risk', async (req, res) => {
    try {
      const result = await pool.query(
        "SELECT * FROM transactions WHERE type = 'liability'"
      );
      const transactions = result.rows;
  
      const grouped = {
        low: transactions.filter(t => t.risk === 'low'),
        med: transactions.filter(t => t.risk === 'med'),
        high: transactions.filter(t => t.risk === 'high'),
      };
  
      // Calculate transfer rate for each risk pool
      const poolsWithTransferRate = Object.entries(grouped).map(([risk, transactions]) => {
        const totalLiabilities = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const weightedCost = transactions.reduce((sum, t) => sum + parseFloat(t.amount) * parseFloat(t.interest_rate) / 100, 0);
        const transferRate = totalLiabilities > 0 ? weightedCost / totalLiabilities : 0;
  
        return {
          risk,
          transactions,
          transferRate,
        };
      });
  
      res.json(poolsWithTransferRate);
    } catch (err) {
      res.status(500).json({ error: 'Failed to calculate transfer rate by risk' });
    }
  });



app.get('/transactions/pool-by-maturity', async (req, res) => {
    try {
      const { ranges } = req.query; // e.g., "0-1,1-3,3+"
      const pools = ranges.split(',').map(range => {
        if (range.endsWith('+')) {
          const min = parseFloat(range.slice(0, -1)); // Remove the '+' and parse the number
          return { min, max: Infinity }; // Use Infinity for "3+"
        } else {
          const [min, max] = range.split('-');
          return { min: parseFloat(min), max: parseFloat(max) };
        }
      });
  
      const result = await pool.query(
        "SELECT * FROM transactions WHERE type = 'liability'"
      );
      const transactions = result.rows;
  
      console.log('All transactions:', transactions); // Debugging: Log all transactions
  
      const grouped = pools.map(pool => {
        const poolTransactions = transactions.filter(t => {
          const maturity = parseFloat(t.maturity); // Convert maturity to a number
          if (pool.max === Infinity) {
            return maturity >= pool.min; // Handle "3+"
          } else {
            return maturity >= pool.min && maturity <= pool.max;
          }
        });
  
        console.log(`Transactions for range ${pool.min}-${pool.max}:`, poolTransactions); // Debugging: Log filtered transactions
  
        const totalLiabilities = poolTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const weightedCost = poolTransactions.reduce((sum, t) => sum + parseFloat(t.amount) * parseFloat(t.interest_rate) / 100, 0);
        const transferRate = totalLiabilities > 0 ? weightedCost / totalLiabilities : 0;
  
        return {
          range: pool.max === Infinity ? `${pool.min}+` : `${pool.min}-${pool.max}`,
          transactions: poolTransactions,
          transferRate,
        };
      });
  
      res.json(grouped);
    } catch (err) {
      res.status(500).json({ error: 'Failed to calculate transfer rate by maturity' });
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
