/**
 * Migración para crear la tabla de suscripciones
 */
export function up(knex) {
  return knex.schema.createTable('subscriptions', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()')); // UUID como clave primaria
    table.string('user_id').notNullable();
    table.enum('status', ['active', 'canceled', 'expired']).notNullable().defaultTo('active');
    table.string('stripe_customer_id');
    table.string('stripe_subscription_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('current_period_end');
    table.boolean('cancel_at_period_end').defaultTo(false);
    table.string('plan').defaultTo('pro');
    table.string('price_id'); // ID del precio en Stripe
    
    // Relación con la tabla de usuarios
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices para búsquedas frecuentes
    table.index('user_id');
    table.index('stripe_subscription_id');
  });
}

export function down(knex) {
  return knex.schema.dropTable('subscriptions');
}