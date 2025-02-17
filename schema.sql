
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    type VARCHAR(10) CHECK (type IN ('asset', 'liability')),
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interest_rate NUMERIC(6,4)
);
CREATE TYPE risk_level AS ENUM ('low', 'med', 'high');

ALTER TABLE transactions
ADD COLUMN risk risk_level DEFAULT 'low',
ADD COLUMN maturity NUMERIC(5, 2) DEFAULT 0;
