/**
 * =================================================================================================
 * SEED: USUARIOS
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.seed = async function(knex) {
  // Truncar tabla para empezar limpio
  await knex('users').del();
  
  // Insertar usuarios de prueba
  await knex('users').insert([
    {
      id: 'google_123456789',
      email: 'admin@listosapp.com',
      name: 'Administrador',
      picture: 'https://via.placeholder.com/150',
      email_verified: true,
      role: 'admin',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'es',
        notifications: true
      }),
      worksheet_count: 25,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      last_login: knex.fn.now()
    },
    {
      id: 'google_987654321',
      email: 'usuario@ejemplo.com',
      name: 'Usuario Ejemplo',
      picture: 'https://via.placeholder.com/150',
      email_verified: true,
      role: 'user',
      preferences: JSON.stringify({
        theme: 'dark',
        language: 'es',
        notifications: false
      }),
      worksheet_count: 12,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      last_login: knex.fn.now()
    },
    {
      id: 'google_555555555',
      email: 'profesor@escuela.edu',
      name: 'Profesor Ejemplo',
      picture: 'https://via.placeholder.com/150',
      email_verified: true,
      role: 'user',
      preferences: JSON.stringify({
        theme: 'light',
        language: 'es',
        notifications: true,
        defaultSubject: 'math'
      }),
      worksheet_count: 45,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
      last_login: knex.fn.now()
    }
  ]);
};