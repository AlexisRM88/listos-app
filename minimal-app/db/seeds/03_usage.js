/**
 * =================================================================================================
 * SEED: REGISTROS DE USO
 * =================================================================================================
 */

/**
 * @param {import('knex')} knex
 */
exports.seed = async function(knex) {
  // Truncar tabla para empezar limpio
  await knex('usage').del();
  
  // Generar fechas aleatorias en los últimos 3 meses
  function randomDate() {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    
    return new Date(
      threeMonthsAgo.getTime() + Math.random() * (now.getTime() - threeMonthsAgo.getTime())
    ).toISOString();
  }
  
  // Generar registros de uso para cada usuario
  const usageRecords = [];
  
  // Usuario admin
  for (let i = 0; i < 25; i++) {
    usageRecords.push({
      user_id: 'google_123456789',
      document_type: Math.random() > 0.3 ? 'worksheet' : 'quiz',
      subject: ['math', 'science', 'history', 'language'][Math.floor(Math.random() * 4)],
      grade: ['1st', '2nd', '3rd', '4th', '5th'][Math.floor(Math.random() * 5)],
      language: Math.random() > 0.2 ? 'es' : 'en',
      metadata: JSON.stringify({
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        topics: ['fractions', 'algebra', 'geometry'][Math.floor(Math.random() * 3)]
      }),
      created_at: randomDate()
    });
  }
  
  // Usuario normal
  for (let i = 0; i < 12; i++) {
    usageRecords.push({
      user_id: 'google_987654321',
      document_type: 'worksheet',
      subject: ['math', 'science'][Math.floor(Math.random() * 2)],
      grade: ['3rd', '4th'][Math.floor(Math.random() * 2)],
      language: 'es',
      metadata: JSON.stringify({
        difficulty: ['easy', 'medium'][Math.floor(Math.random() * 2)],
        topics: ['fractions', 'decimals'][Math.floor(Math.random() * 2)]
      }),
      created_at: randomDate()
    });
  }
  
  // Profesor
  for (let i = 0; i < 45; i++) {
    usageRecords.push({
      user_id: 'google_555555555',
      document_type: i % 5 === 0 ? 'quiz' : 'worksheet',
      subject: ['math', 'science', 'history', 'language', 'art'][Math.floor(Math.random() * 5)],
      grade: ['1st', '2nd', '3rd', '4th', '5th', '6th'][Math.floor(Math.random() * 6)],
      language: 'es',
      metadata: JSON.stringify({
        difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
        topics: ['fractions', 'algebra', 'geometry', 'statistics'][Math.floor(Math.random() * 4)],
        customized: true
      }),
      created_at: randomDate()
    });
  }
  
  // Insertar todos los registros
  await knex('usage').insert(usageRecords);
};