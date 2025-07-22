/**
 * Servidor Express mínimo para Cloud Run
 */

const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware básico
app.use(express.json());

// Health check para Cloud Run
app.get('/health', (req, res) => {
  console.log('Health check solicitado');
  res.status(200).send('OK');
});

// Ruta principal
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>ListosApp</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
          h1 { color: #4285f4; }
          .container { max-width: 800px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>ListosApp</h1>
          <p>Servidor funcionando correctamente en Cloud Run.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Variables de entorno:</p>
          <ul>
            <li>PORT: ${process.env.PORT || '8080 (default)'}</li>
            <li>NODE_ENV: ${process.env.NODE_ENV || 'no definido'}</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// API de ejemplo
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor iniciado en http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check disponible en http://0.0.0.0:${PORT}/health`);
});