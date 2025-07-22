import { http, HttpResponse } from 'msw';

// Mock API handlers for testing
export const handlers = [
  // Auth service mocks
  http.post('/api/user/login', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/profile.jpg',
      role: 'user'
    });
  }),
  
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/profile.jpg',
      role: 'user',
      subscription: {
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  }),
  
  // Subscription service mocks
  http.get('/api/subscription/status', () => {
    return HttpResponse.json({
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false
    });
  }),
  
  http.post('/api/subscription/create', () => {
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/test-session'
    });
  }),
  
  http.post('/api/subscription/cancel', () => {
    return HttpResponse.json({
      status: 'canceled',
      cancelAtPeriodEnd: true
    });
  }),
  
  // Webhook mock
  http.post('/api/webhooks/stripe', () => {
    return new HttpResponse(null, { status: 200 });
  })
];