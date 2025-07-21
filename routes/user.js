/**
 * =================================================================================================
 * RUTAS DE API PARA USUARIOS
 * =================================================================================================
 * Este archivo define las rutas de API relacionadas con la gestión de usuarios.
 */

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import databaseService from '../services/databaseService.js';

const router = express.Router();
const db = databaseService.getDb();

// Cliente de OAuth2 para verificar tokens de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar autenticación
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
    }
    
    // Verificar token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Obtener perfil del usuario autenticado
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener usuario de la base de datos
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener suscripción activa si existe
    const subscription = await db('subscriptions')
      .where({ 
        user_id: userId,
        status: 'active'
      })
      .orderBy('created_at', 'desc')
      .first();
    
    // Crear respuesta
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture || '',
      worksheetCount: user.worksheet_count,
      isPro: !!subscription,
      subscription: subscription || null,
      role: user.role
    };
    
    res.json(userProfile);
  } catch (error) {
    console.error('Error al obtener perfil de usuario:', error);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

/**
 * Iniciar sesión o registrar usuario con Google
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({ error: 'Token de ID no proporcionado' });
    }
    
    // Verificar token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const userId = payload.sub;
    
    // Verificar si el usuario ya existe
    let user = await db('users').where({ id: userId }).first();
    
    if (user) {
      // Actualizar último inicio de sesión
      await db('users')
        .where({ id: userId })
        .update({ 
          last_login: db.fn.now(),
          name: payload.name,
          picture: payload.picture
        });
    } else {
      // Crear nuevo usuario
      await db('users').insert({
        id: userId,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        created_at: db.fn.now(),
        last_login: db.fn.now(),
        role: 'user',
        worksheet_count: 0
      });
      
      // Obtener usuario recién creado
      user = await db('users').where({ id: userId }).first();
    }
    
    // Obtener suscripción activa si existe
    const subscription = await db('subscriptions')
      .where({ 
        user_id: userId,
        status: 'active'
      })
      .orderBy('created_at', 'desc')
      .first();
    
    // Crear respuesta
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture || '',
      worksheetCount: user.worksheet_count,
      isPro: !!subscription,
      subscription: subscription || null,
      role: user.role
    };
    
    res.json(userProfile);
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

/**
 * Actualizar perfil de usuario
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;
    
    // Validar datos
    if (!name) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }
    
    // Actualizar usuario
    await db('users')
      .where({ id: userId })
      .update({ name });
    
    // Obtener usuario actualizado
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture || ''
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

/**
 * Incrementar contador de hojas de trabajo
 */
router.post('/increment-worksheet-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener usuario
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si el usuario es Pro
    const subscription = await db('subscriptions')
      .where({ 
        user_id: userId,
        status: 'active'
      })
      .first();
    
    // Si el usuario es Pro, no incrementar contador
    if (subscription) {
      return res.json({ 
        worksheetCount: user.worksheet_count,
        isPro: true
      });
    }
    
    // Incrementar contador
    const newCount = (user.worksheet_count || 0) + 1;
    
    // Actualizar en la base de datos
    await db('users')
      .where({ id: userId })
      .update({ worksheet_count: newCount });
    
    // Registrar uso
    await db('usage').insert({
      user_id: userId,
      document_type: req.body.documentType || 'worksheet',
      created_at: db.fn.now(),
      subject: req.body.subject,
      grade: req.body.grade,
      language: req.body.language
    });
    
    res.json({ 
      worksheetCount: newCount,
      isPro: false
    });
  } catch (error) {
    console.error('Error al incrementar contador:', error);
    res.status(500).json({ error: 'Error al incrementar contador' });
  }
});

/**
 * Migrar datos de localStorage a la base de datos
 */
router.post('/migrate-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { worksheetCount, isPro } = req.body;
    
    // Obtener usuario
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar contador si es mayor que el actual
    if (worksheetCount > user.worksheet_count) {
      await db('users')
        .where({ id: userId })
        .update({ worksheet_count: worksheetCount });
    }
    
    // Si el usuario era Pro en localStorage, crear una suscripción en la base de datos
    if (isPro) {
      const existingSubscription = await db('subscriptions')
        .where({ 
          user_id: userId,
          status: 'active'
        })
        .first();
        
      if (!existingSubscription) {
        // Crear suscripción con datos básicos
        await db('subscriptions').insert({
          user_id: userId,
          status: 'active',
          created_at: db.fn.now(),
          plan: 'pro',
          cancel_at_period_end: false
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error al migrar datos:', error);
    res.status(500).json({ error: 'Error al migrar datos' });
  }
});

export default router;