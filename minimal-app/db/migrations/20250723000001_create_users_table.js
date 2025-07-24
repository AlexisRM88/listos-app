/**
 * =================================================================================================
 * MIGRACIÓN: CREAR TABLA DE USUARIOS
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', table => {
    // Identificación
    table.string('id').primary().comment('ID de Google OAuth');
    table.string('email').notNullable().unique().comment('Email del usuario');
    table.string('name').notNullable().comment('Nombre completo');
    table.string('picture').comment('URL de la imagen de perfil');
    
    // Metadatos
    table.boolean('email_verified').defaultTo(false).comment('Si el email está verificado');
    table.string('role').defaultTo('user').comment('Rol: user, admin');
    
    // Preferencias
    table.jsonb('preferences').defaultTo('{}').comment('Preferencias del usuario');
    
    // Estadísticas
    table.integer('worksheet_count').defaultTo(0).comment('Número de hojas de trabajo generadas');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Fecha de creación');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('Fecha de actualización');
    table.timestamp('last_login').defaultTo(knex.fn.now()).comment('Último inicio de sesión');
    
    // Índices
    table.index('email');
    table.index('role');
  });
};

/**
 * @param {import('knex')} knex
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};