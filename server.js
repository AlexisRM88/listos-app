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

// Configuración
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8080;
const app = express();

// Importar servicios y rutas de forma segura
let databaseService;
let stripeRoutes, userRoutes, adminRoutes, subscriptionRoutes;
let adminSubscriptionRoutes, adminAnalyticsRoutes;

try {
  databaseService = (await import('./services/databaseService.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar databaseService:', error.message);
}

try {
  stripeRoutes = (await import('./routes/stripe.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar stripeRoutes:', error.message);
}

try {
  userRoutes = (await import('./routes/user.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar userRoutes:', error.message);
}

try {
  adminRoutes = (await import('./routes/admin.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar adminRoutes:', error.message);
}

try {
  subscriptionRoutes = (await import('./routes/subscription.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar subscriptionRoutes:', error.message);
}

try {
  adminSubscriptionRoutes = (await import('./routes/adminSubscriptionRoutes.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar adminSubscriptionRoutes:', error.message);
}

try {
  adminAnalyticsRoutes = (await import('./routes/adminAnalyticsRoutes.js')).default;
} catch (error) {
  console.error('⚠️ Error al importar adminAnalyticsRoutes:', error.message);
}

// Middleware
app.use(cors());

// Webhook endpoint needs raw body, so it must come before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Verificar conexión a la base de datos (no bloquear el startup)
if (databaseService) {
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
        console.error('❌ No se pudo conectar a la base de datos - continuando sin DB');
      }
    })
    .catch(err => {
      console.error('❌ Error al verificar conexión a la base de datos:', err);
      console.log('⚠️ Continuando sin conexión a la base de datos');
    });
}

// Rutas API
if (stripeRoutes) app.use('/api/stripe', stripeRoutes);
if (userRoutes) app.use('/api/user', userRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);
if (adminSubscriptionRoutes) app.use('/api/admin', adminSubscriptionRoutes);
if (adminAnalyticsRoutes) app.use('/api/admin', adminAnalyticsRoutes);
if (subscriptionRoutes) app.use('/api/subscription', subscriptionRoutes);

// Ruta para verificar estado del servidor
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => {
  console.log('🔍 Health check solicitado');
  res.status(200).send('OK');
});

// Servir la aplicación React para cualquier otra ruta (incluyendo rutas de admin)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  // No cerrar el proceso, solo loggear
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  // No cerrar el proceso, solo loggear
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor iniciado en http://0.0.0.0:${PORT}`);
  console.log(`📊 Health check disponible en http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🔧 PORT: ${process.env.PORT}`);
});

server.on('error', (error) => {
  console.error('❌ Error del servidor:', error);
});