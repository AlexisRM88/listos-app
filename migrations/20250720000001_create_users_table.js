/**
 * Migración para crear la tabla de usuarios
 */
export function up(knex) {
  return knex.schema.createTable('users', table => {
    table.string('id').primary(); // ID de Google como clave primaria
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.string('picture');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('last_login').defaultTo(knex.fn.now());
    table.enum('role', ['user', 'admin']).defaultTo('user');
    table.integer('worksheet_count').defaultTo(0); // Contador para usuarios gratuitos
    
    // Índices para búsquedas frecuentes
    table.index('email');
  });
}

export function down(knex) {
  return knex.schema.dropTable('users');
}