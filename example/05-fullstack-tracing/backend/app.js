const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'traceparent', 'tracestate'],
}));
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'testdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Get tracer
const tracer = trace.getTracer('backend-api-tracer', '1.0.0');

// Initialize database
async function initDatabase() {
  const span = tracer.startSpan('database.initialize');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    span.setStatus({ code: SpanStatusCode.OK });
    console.log('✅ Database initialized');
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('❌ Database initialization failed:', error);
  } finally {
    span.end();
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  const span = tracer.startSpan('backend.health_check');
  
  try {
    // Check database connection
    const dbCheckSpan = tracer.startSpan('database.health_check', {}, context.active());
    try {
      const result = await pool.query('SELECT NOW()');
      dbCheckSpan.setAttribute('database.connected', true);
      dbCheckSpan.setStatus({ code: SpanStatusCode.OK });
      dbCheckSpan.end();
      
      span.setStatus({ code: SpanStatusCode.OK });
      res.json({
        status: 'healthy',
        service: 'backend-api',
        database: 'connected',
        timestamp: result.rows[0].now
      });
    } catch (dbError) {
      dbCheckSpan.recordException(dbError);
      dbCheckSpan.setStatus({ code: SpanStatusCode.ERROR, message: dbError.message });
      dbCheckSpan.end();
      throw dbError;
    }
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'backend-api',
      database: 'disconnected',
      error: error.message
    });
  } finally {
    span.end();
  }
});

// Create user
app.post('/users', async (req, res) => {
  const span = tracer.startSpan('backend.create_user');
  const { username, email } = req.body;
  
  span.setAttribute('user.username', username);
  span.setAttribute('user.email', email);
  
  try {
    // Validate input
    if (!username || !email) {
      span.setAttribute('validation.error', 'Missing required fields');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing required fields' });
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    // Insert into database
    const result = await pool.query(
      'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING *',
      [username, email]
    );
    
    const user = result.rows[0];
    span.setAttribute('user.id', user.id);
    span.setAttribute('database.rows_affected', result.rowCount);
    span.setStatus({ code: SpanStatusCode.OK });
    
    res.status(201).json(user);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user', details: error.message });
  } finally {
    span.end();
  }
});

// Get all users
app.get('/users', async (req, res) => {
  const span = tracer.startSpan('backend.list_users');
  
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id DESC');
    
    span.setAttribute('users.count', result.rowCount);
    span.setStatus({ code: SpanStatusCode.OK });
    
    res.json(result.rows);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  } finally {
    span.end();
  }
});

// Get user by ID
app.get('/users/:id', async (req, res) => {
  const span = tracer.startSpan('backend.get_user');
  const userId = req.params.id;
  
  span.setAttribute('user.id', userId);
  
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      span.setAttribute('user.found', false);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
      return res.status(404).json({ error: 'User not found' });
    }
    
    span.setAttribute('user.found', true);
    span.setAttribute('user.username', result.rows[0].username);
    span.setStatus({ code: SpanStatusCode.OK });
    
    res.json(result.rows[0]);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user', details: error.message });
  } finally {
    span.end();
  }
});

// Update user
app.put('/users/:id', async (req, res) => {
  const span = tracer.startSpan('backend.update_user');
  const userId = req.params.id;
  const { username, email } = req.body;
  
  span.setAttribute('user.id', userId);
  span.setAttribute('user.username', username);
  span.setAttribute('user.email', email);
  
  try {
    // Validate input
    if (!username || !email) {
      span.setAttribute('validation.error', 'Missing required fields');
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'Missing required fields' });
      return res.status(400).json({ error: 'Username and email are required' });
    }
    
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [username, email, userId]
    );
    
    if (result.rows.length === 0) {
      span.setAttribute('user.found', false);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
      return res.status(404).json({ error: 'User not found' });
    }
    
    span.setAttribute('user.found', true);
    span.setAttribute('database.rows_affected', result.rowCount);
    span.setStatus({ code: SpanStatusCode.OK });
    
    res.json(result.rows[0]);
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user', details: error.message });
  } finally {
    span.end();
  }
});

// Delete user
app.delete('/users/:id', async (req, res) => {
  const span = tracer.startSpan('backend.delete_user');
  const userId = req.params.id;
  
  span.setAttribute('user.id', userId);
  
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
    
    if (result.rows.length === 0) {
      span.setAttribute('user.found', false);
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'User not found' });
      return res.status(404).json({ error: 'User not found' });
    }
    
    span.setAttribute('user.found', true);
    span.setAttribute('database.rows_affected', result.rowCount);
    span.setStatus({ code: SpanStatusCode.OK });
    
    res.json({ message: 'User deleted successfully', user: result.rows[0] });
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  } finally {
    span.end();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(err);
    span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Backend API server running on port ${PORT}`);
      console.log(`📊 OpenTelemetry traces being sent to collector`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

startServer();
