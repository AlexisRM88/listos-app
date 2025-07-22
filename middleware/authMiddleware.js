/**
 * =================================================================================================
 * MIDDLEWARE DE AUTENTICACIÓN Y AUTORIZACIÓN
 * =================================================================================================
 * Este archivo define middleware para proteger rutas que requieren autenticación y autorización.
 */

import { OAuth2Client } from 'google-auth-library';
import databaseService from '../services/databaseService.js';

const db = databaseService.getDb();

// Cliente de OAuth2 para verificar tokens de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar autenticación
 */
export const authenticate = async (req, res, next) => {
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
 * Middleware para verificar autorización de administrador
 */
export const isAdmin = async (req, res, next) => {
  try {
    // Primero autenticar al usuario
    authenticate(req, res, async () => {
      const userId = req.user.id;
      
      // Obtener usuario de la base de datos
      const user = await db('users').where({ id: userId }).first();
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
      }
      
      req.adminUser = user;
      next();
    });
  } catch (error) {
    console.error('Error al verificar permisos de administrador:', error);
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
};