/**
 * Migración para crear la tabla de uso
 */
export function up(knex) {
  return knex.schema.createTable('usage', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); // UUID como clave primaria
    table.string('user_id').notNullable();
    table.enum('document_type', ['worksheet', 'exam']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.string('subject'); // Materia del documento
    table.string('grade'); // Grado escolar
    table.string('language'); // Idioma del documento
    
    // Columna JSON para metadatos adicionales (compatible con PostgreSQL y MySQL)
    if (knex.client.config.client === 'pg') {
      table.jsonb('metadata').defaultTo('{}');
    } else {
      table.json('metadata');
    }
    
    // Relación con la tabla de usuarios
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices para búsquedas frecuentes
    table.index('user_id');
    table.index('document_type');
    table.index('created_at');
  });
}

export function down(knex) {
  return knex.schema.dropTable('usage');
}