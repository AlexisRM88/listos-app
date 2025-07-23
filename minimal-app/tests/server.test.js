/**
 * =================================================================================================
 * PRUEBAS DEL SERVIDOR
 * =================================================================================================
 * Pruebas básicas para verificar el funcionamiento del servidor.
 */

const request = require('supertest');
const app = require('../server');

describe('Servidor ListosApp', () => {
  
  describe('Health Checks', () => {
    test('GET /health debería devolver status 200', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
    
    test('GET /health/deep debería devolver información detallada', async () => {
      const response = await request(app)
        .get('/health/deep')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('services');
    });
  });
  
  describe('API Endpoints', () => {
    test('GET /api/status debería devolver información de la API', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('version');
    });
    
    test('POST /api/echo debería devolver el mensaje enviado', async () => {
      const testMessage = { message: 'Hola mundo' };
      
      const response = await request(app)
        .post('/api/echo')
        .send(testMessage)
        .expect(200);
      
      expect(response.body).toHaveProperty('echo');
      expect(response.body.echo).toEqual(testMessage);
    });
  });
  
  describe('Rutas no encontradas', () => {
    test('GET /ruta-inexistente debería devolver 404', async () => {
      await request(app)
        .get('/ruta-inexistente')
        .expect(404);
    });
  });
  
});