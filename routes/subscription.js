/**
 * =================================================================================================
 * RUTAS DE SUSCRIPCIONES PARA LISTOSAPP
 * =================================================================================================
 * Este archivo maneja las rutas relacionadas con la gestión de suscripciones,
 * incluyendo verificación de estado, límites de uso y gestión de beneficios.
 */

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import subscriptionService from '../services/subscriptionService.js';

const router = express.Router();

// Inicializar cliente de Google Auth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar token de Google
 */
const verifyGoogleToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    const idToken = authHeader.substring(7);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    next();
  } catch (error) {
    console.error('Error verificando token de Google:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * GET /api/subscription/status
 * Obtiene el estado completo de suscripción del usuario
 */
router.get('/status', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const status = await subscriptionService.getSubscriptionStatus(userId);
    
    res.json({
      success: true,
      data: status,
    });

  } catch (error) {
    console.error('Error obteniendo estado de suscripción:', error);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo obtener el estado de la suscripción' 
    });
  }
});

/**
 * GET /api/subscription/can-generate
 * Verifica si el usuario puede generar un documento
 */
router.get('/can-generate', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const result = await subscriptionService.canGenerateDocument(userId);
    
    res.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Error verificando límites de generación:', error);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo verificar los límites de generación' 
    });
  }
});

/**
 * POST /api/subscription/record-usage
 * Registra el uso de un documento
 */
router.post('/record-usage', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { documentType, subject, grade, language } = req.body;

    // Validar datos requeridos
    if (!documentType || !['worksheet', 'exam'].includes(documentType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Tipo de documento inválido' 
      });
    }

    const result = await subscriptionService.recordDocumentUsage(
      userId,
      documentType,
      { subject, grade, language }
    );

    if (!result.success) {
      return res.status(403).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        remainingUses: result.remainingUses,
      },
    });

  } catch (error) {
    console.error('Error registrando uso de documento:', error);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo registrar el uso del documento' 
    });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancela la suscripción del usuario al final del período
 */
router.post('/cancel', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const result = await subscriptionService.cancelSubscription(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Suscripción programada para cancelación al final del período',
        cancelAt: result.cancelAt,
      },
    });

  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo cancelar la suscripción' 
    });
  }
});

/**
 * POST /api/subscription/reactivate
 * Reactiva una suscripción cancelada
 */
router.post('/reactivate', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    
    const result = await subscriptionService.reactivateSubscription(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Suscripción reactivada exitosamente',
      },
    });

  } catch (error) {
    console.error('Error reactivando suscripción:', error);
    res.status(500).json({ 
      success: false,
      error: 'No se pudo reactivar la suscripción' 
    });
  }
});

export default router;