require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5257;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(s => s.trim())
    : ['http://localhost:8081', 'http://127.0.0.1:8081'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/users/:userId/tasks', require('./routes/tasks'));
app.use('/api/users/:userId/categories', require('./routes/categories'));
app.use('/api/users/:userId/notifications', require('./routes/notifications'));
app.use('/api/tasks/:taskId/reminders', require('./routes/reminders'));
app.use('/api/tasks/:taskId/history', require('./routes/taskHistory'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/teams', require('./routes/teams'));

// Start server (skip when imported for testing)
if (require.main === module) {
  sequelize.authenticate()
    .then(() => {
      console.log('Database connected.');
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => {
      console.error('Database connection failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;
