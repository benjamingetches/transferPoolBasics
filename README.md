# Transfer Pricing App

The **Transfer Pricing App** is a web-based application designed to calculate the **transfer rate** for financial transactions. It supports both **single-pool** and **multi-pool** functionality, allowing users to manage transactions, calculate weighted average interest rates, and switch between different views for analysis.

---

## Features

1. **Single Pool Functionality**:
   - Add transactions as either **assets** or **liabilities**.
   - Specify the **amount**, **interest rate**, and **description** for each transaction.
   - View a list of all transactions in a table.
   - Delete transactions as needed.
   - Calculate and display the **transfer rate** as the weighted average cost of liabilities.

2. **Multi Pool Functionality** (Placeholder):
   - Switch to a multi-pool view for future functionality.
   - This feature will allow grouping transactions into multiple pools for advanced analysis.

3. **User-Friendly Interface**:
   - Clean and intuitive design with hover effects and transitions.
   - Info modal to explain how the transfer rate is calculated.

4. **Backend Integration**:
   - Built with **Node.js** and **Express** for the backend.
   - Uses **PostgreSQL** for storing transactions.
   - RESTful API for CRUD operations and transfer rate calculation.

---

## How to Run the App on Your Machine

Follow these steps to set up and run the Transfer Pricing App on your local machine.

### Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v16 or higher): [Download Node.js](https://nodejs.org/)
2. **PostgreSQL** (v12 or higher): [Download PostgreSQL](https://www.postgresql.org/download/)
3. **Git** (optional): [Download Git](https://git-scm.com/)

---

### Step 1: Clone the Repository

If you have Git installed, clone the repository to your local machine:
If not, download/extract the ZIP

```bash
git clone https://github.com/your-repo/transfer-pricing-app.git
cd transfer-pricing-app
```

### Step 2: Set Up Database

Install PostgreSQL:
    Follow the installation instructions for your operating system.
    During installation, note down the username, password, and port (default is 5432).

Create a Database:
    Open the PostgreSQL command-line tool (psql) or a GUI like pgAdmin.
    Run the following SQL commands to create a database:
```bash
CREATE DATABASE transfer_pricing_db;
```
Set-up Tables:
    Run the Schema:
```bash
psql -U your_username -d transfer_pricing_db -f schema.sql
```
Replace your_username with your postgres username

### Step 3: Enviornment Variables
Create a .env in the root of the project
Add the following:


DATABASE_URL=postgres://your_username:your_password@localhost:5432/transfer_pricing_db
PORT=5001

Replacing the user, pass, and (if needed) the ports

### Step 4: Install Dependencies
In terminal, navigate to directory 
```bash
cd transfer-pricing-app
```
Then, run:
```bash
npm install
```

### Step 5: Start the backend
Run:
```bash 
node server.js
```
The server will now start on localhost:port



This is a WIP, and we are adding functionality!
