
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) CHECK (type IN ('asset', 'liability')),
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interest_rate NUMERIC(6,4)
);

