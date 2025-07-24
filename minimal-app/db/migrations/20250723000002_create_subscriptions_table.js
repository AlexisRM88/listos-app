/**
 * =================================================================================================
 * MIGRACIÓN: CREAR TABLA DE SUSCRIPCIONES
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.up = function(knex) {
  return knex.schema.createTable('subscriptions', table => {
    // Identificación
    table.increments('id').primary().comment('ID interno de la suscripción');
    table.string('user_id').notNullable().comment('ID del usuario');
    table.string('stripe_customer_id').comment('ID del cliente en Stripe');
    table.string('stripe_subscription_id').comment('ID de la suscripción en Stripe');
    
    // Detalles de la suscripción
    table.string('status').notNullable().defaultTo('inactive').comment('Estado: active, inactive, past_due, canceled');
    table.string('plan').notNullable().comment('Nombre del plan: free, basic, pro, unlimited');
    table.string('price_id').comment('ID del precio en Stripe');
    
    // Fechas
    table.timestamp('current_period_start').comment('Inicio del período actual');
    table.timestamp('current_period_end').comment('Fin del período actual');
    table.boolean('cancel_at_period_end').defaultTo(false).comment('Si se cancelará al final del período');
    
    // Límites
    table.integer('worksheet_limit').defaultTo(0).comment('Límite de hojas de trabajo');
    
    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Fecha de creación');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('Fecha de actualización');
    table.timestamp('canceled_at').comment('Fecha de cancelación');
    
    // Relaciones
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
    
    // Índices
    table.index('user_id');
    table.index('stripe_subscription_id');
    table.index('status');
  });
};

/**
 * @param {import('knex')} knex
 */
exports.down = function(knex) {
  return knex.schema.dropTable('subscriptions');
};