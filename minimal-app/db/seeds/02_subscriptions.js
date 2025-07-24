/**
 * =================================================================================================
 * SEED: SUSCRIPCIONES
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.seed = async function(knex) {
  // Truncar tabla para empezar limpio
  await knex('subscriptions').del();
  
  // Fechas para las suscripciones
  const now = new Date();
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(now.getMonth() + 1);
  
  // Insertar suscripciones de prueba
  await knex('subscriptions').insert([
    {
      user_id: 'google_123456789', // Admin
      stripe_customer_id: 'cus_admin123',
      stripe_subscription_id: 'sub_admin123',
      status: 'active',
      plan: 'unlimited',
      price_id: 'price_unlimited',
      current_period_start: oneMonthAgo.toISOString(),
      current_period_end: oneMonthLater.toISOString(),
      cancel_at_period_end: false,
      worksheet_limit: 999,
      created_at: oneMonthAgo.toISOString(),
      updated_at: oneMonthAgo.toISOString()
    },
    {
      user_id: 'google_987654321', // Usuario normal
      stripe_customer_id: 'cus_user123',
      stripe_subscription_id: 'sub_user123',
      status: 'active',
      plan: 'basic',
      price_id: 'price_basic',
      current_period_start: oneMonthAgo.toISOString(),
      current_period_end: oneMonthLater.toISOString(),
      cancel_at_period_end: false,
      worksheet_limit: 5,
      created_at: oneMonthAgo.toISOString(),
      updated_at: oneMonthAgo.toISOString()
    },
    {
      user_id: 'google_555555555', // Profesor
      stripe_customer_id: 'cus_teacher123',
      stripe_subscription_id: 'sub_teacher123',
      status: 'active',
      plan: 'pro',
      price_id: 'price_pro',
      current_period_start: oneMonthAgo.toISOString(),
      current_period_end: oneMonthLater.toISOString(),
      cancel_at_period_end: true, // No se renovará
      worksheet_limit: 20,
      created_at: oneMonthAgo.toISOString(),
      updated_at: now.toISOString()
    }
  ]);
};