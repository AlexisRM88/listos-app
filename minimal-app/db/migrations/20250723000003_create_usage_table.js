/**
 * =================================================================================================
 * MIGRACIÓN: CREAR TABLA DE USO
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.up = function(knex) {
  return knex.schema.createTable('usage', table => {
    // Identificación
    table.increments('id').primary().comment('ID interno del registro de uso');
    table.string('user_id').notNullable().comment('ID del usuario');
    
    // Detalles del uso
    table.string('document_type').notNullable().comment('Tipo de documento: worksheet, quiz, etc.');
    table.string('subject').comment('Materia: math, science, etc.');
    table.string('grade').comment('Grado escolar');
    table.string('language').defaultTo('es').comment('Idioma del documento');
    
    // Metadatos
    table.jsonb('metadata').defaultTo('{}').comment('Metadatos adicionales');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Fecha de creación');
    
    // Relaciones
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices
    table.index('user_id');
    table.index('document_type');
    table.index('created_at');
  });
};

/**
 * @param {import('knex')} knex
 */
exports.down = function(knex) {
  return knex.schema.dropTable('usage');
};