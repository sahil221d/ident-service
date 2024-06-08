import express from 'express';
import bodyParser from 'body-parser';
import identityRoutes from './routes/identityRoutes';
import mysql from 'mysql2';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database: ', err);
    return;
  }
  console.log('Connected to the MySQL server.');

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS Contact (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NULL,
      phoneNumber VARCHAR(20) NULL,
      linkedId INT NULL,
      linkPrecedence ENUM('primary', 'secondary') NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deletedAt TIMESTAMP NULL
    );
  `;

  connection.query(createTableQuery, (err, results) => {
    if (err) {
      console.error('Error creating table: ', err);
    } else {
      console.log('Table "Contact" ensured to exist or created successfully.');
    }
  });
});

// Middleware
app.use(bodyParser.json());

// Routes
app.use('', identityRoutes);

// Default route
app.get('/', (req, res) => {
  res.send('Bitespeed Identity Service is running!');
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default connection;