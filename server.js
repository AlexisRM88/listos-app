/**
 * =================================================================================================
 * SERVIDOR EXPRESS PARA LISTOSAPP
 * =================================================================================================
 * Este archivo configura el servidor Express que maneja las API y sirve la aplicación React.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import databaseService from './services/databaseService.js';

// Importar rutas API
import stripeRoutes from './routes/stripe.js';
import geminiRoutes from './routes/gemini.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import subscriptionRoutes from './routes/subscription.js';

// Configuración
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(cors());

// Webhook endpoint needs raw body, so it must come before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Verificar conexión a la base de datos
databaseService.testConnection()
  .then(connected => {
    if (connected) {
      console.log('✅ Conexión a la base de datos establecida');
      // Ejecutar migraciones si es necesario
      if (process.env.AUTO_MIGRATE === 'true') {
        databaseService.runMigrations()
          .then(({ batchNo, log }) => {
            if (log.length > 0) {
              console.log(`✅ Migraciones aplicadas (batch ${batchNo})`);
            }
          })
          .catch(err => console.error('❌ Error al ejecutar migraciones:', err));
      }
    } else {
      console.error('❌ No se pudo conectar a la base de datos');
    }
  })
  .catch(err => console.error('❌ Error al verificar conexión a la base de datos:', err));

// Rutas API
app.use('/api/stripe', stripeRoutes);
app.use('/api/gemini', geminiRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Ruta para verificar estado del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir la aplicación React para cualquier otra ruta (incluyendo rutas de admin)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en http://localhost:${PORT}`);
});