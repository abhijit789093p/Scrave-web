const request = require('supertest');
const express = require('express');
const path = require('path');
const jestOpenAPI = require('jest-openapi').default;
const { closeDb } = require('../src/db/connection');
const { migrate } = require('../src/db/migrate');
const sqlite3 = require('better-sqlite3');
const config = require('../src/config');
const errorHandler = require('../src/middleware/errorHandler');

// Mock Queue services so we don't need Redis or Playwright during simple integration testing
jest.mock('../src/services/queue', () => ({
  addScreenshotJob: jest.fn().mockResolvedValue({
    waitUntilFinished: jest.fn().mockResolvedValue(Buffer.from('mocked-screenshot-data').toString('base64'))
  }),
  addPdfJob: jest.fn().mockResolvedValue({
    waitUntilFinished: jest.fn().mockResolvedValue(Buffer.from('mocked-pdf-data').toString('base64'))
  }),
  screenshotEvents: {},
  pdfEvents: {}
}));

// Load OpenAPI spec
jestOpenAPI(path.join(__dirname, '../docs/openapi.yaml'));

describe('Integration Tests: API flow', () => {
  let app;
  
  beforeAll(async () => {
    // Run migrations
    migrate();
    
    // Setting up the Express test app
    app = express();
    app.use(express.json());
    
    // Mount routes
    app.use('/api/v1', require('../src/routes/health'));
    app.use('/auth', require('../src/routes/auth'));
    
    const authMiddleware = require('../src/middleware/auth');
    const usageTracker = require('../src/middleware/usageTracker');
    
    app.use('/api/v1', authMiddleware, require('../src/routes/usage'));
    app.use('/api/v1', authMiddleware, usageTracker, require('../src/routes/screenshot'));
    app.use('/api/v1', authMiddleware, usageTracker, require('../src/routes/pdf'));
    
    // Error handler is required to trigger Zod validation format output
    app.use(errorHandler);
  });

  afterAll(() => {
    closeDb();
  });

  it('GET /api/v1/health should verify API connects and sees database', async () => {
     const response = await request(app).get('/api/v1/health');
     expect(response.status).toBe(200);
     expect(response).toSatisfyApiSpec();
  });

  describe('Auth and Usage workflow', () => {
    let storedApiKey = '';
    const testEmail = `integration-${Date.now()}@example.com`;
    const testPassword = 'securePassword123!';

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(201);
      expect(response).toSatisfyApiSpec();
      storedApiKey = response.body.apiKey; // Save for usage later
    });

    it('should login and return user details with api key prefixes', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(200);
      expect(response).toSatisfyApiSpec();
    });

    it('GET /api/v1/usage should return a valid summary using an API key header', async () => {
      const response = await request(app)
        .get('/api/v1/usage')
        .set('x-api-key', storedApiKey);

      expect(response.status).toBe(200);
      expect(response).toSatisfyApiSpec();
    });
    
    it('GET /api/v1/usage missing API key should be rejected', async () => {
      const response = await request(app).get('/api/v1/usage');
      expect(response.status).toBe(401); 
      expect(response).toSatisfyApiSpec();
    });
  });

  describe('Feature Endpoints (Screenshot and PDF)', () => {
    let storedApiKey = '';
    
    beforeAll(async () => {
      // Create user for these tests
      const response = await request(app)
        .post('/auth/register')
        .send({ email: `feature-${Date.now()}@example.com`, password: 'password123' });
      storedApiKey = response.body.apiKey;
    });

    it('POST /api/v1/screenshot should capture a screenshot', async () => {
      const response = await request(app)
        .post('/api/v1/screenshot')
        .set('x-api-key', storedApiKey)
        .send({ url: 'https://example.com' });
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('POST /api/v1/pdf should generate a PDF', async () => {
      const response = await request(app)
        .post('/api/v1/pdf')
        .set('x-api-key', storedApiKey)
        .send({ url: 'https://example.com', format: 'A4' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toBe('application/pdf');
    });
    
    it('POST /api/v1/screenshot should validate input payload', async () => {
      const response = await request(app)
        .post('/api/v1/screenshot')
        .set('x-api-key', storedApiKey)
        .send({ url: 'not-a-valid-url' });
        
      expect(response.status).toBe(400);
      expect(response).toSatisfyApiSpec();
    });
  });
});
