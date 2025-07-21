/**
 * Migración para crear la tabla de sesiones activas
 */
export function up(knex) {
  return knex.schema.createTable('active_sessions', table => {
    table.string('user_id').notNullable();
    table.string('device_id').notNullable();
    table.timestamp('last_active').defaultTo(knex.fn.now());
    
    // Clave primaria compuesta
    table.primary(['user_id', 'device_id']);
    
    // Relación con la tabla de usuarios
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices para búsquedas frecuentes
    table.index('user_id');
    table.index('last_active');
  });
}

export function down(knex) {
  return knex.schema.dropTable('active_sessions');
}