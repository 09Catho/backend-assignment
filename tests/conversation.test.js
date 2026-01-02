const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/database');

describe('Conversation API', () => {
  beforeAll(async () => {
    // Setup test database if needed
  });

  afterAll(async () => {
    // Close database connections
    await db.pool.end();
  });

  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/conversations', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/v1/conversations')
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    it('should list conversations with valid auth', async () => {
      const response = await request(app)
        .get('/api/v1/conversations?limit=10')
        .set('X-Operator-Id', '1')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('conversations');
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });

    it('should filter by state', async () => {
      const response = await request(app)
        .get('/api/v1/conversations?state=QUEUED')
        .set('X-Operator-Id', '1')
        .expect(200);

      const conversations = response.body.data.conversations;
      conversations.forEach(conv => {
        expect(conv.state).toBe('QUEUED');
      });
    });

    it('should validate limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/conversations?limit=150')
        .set('X-Operator-Id', '1')
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Validation');
    });
  });

  describe('POST /api/v1/conversations/allocate', () => {
    it('should allocate conversation to available operator', async () => {
      // First set operator to available
      await request(app)
        .put('/api/v1/operators/1/status')
        .set('X-Operator-Id', '1')
        .send({ status: 'AVAILABLE' })
        .expect(200);

      // Then allocate
      const response = await request(app)
        .post('/api/v1/conversations/allocate')
        .set('X-Operator-Id', '1')
        .send({ operator_id: 1 })
        .expect(200);

      expect(response.body.status).toBe('success');
      if (response.body.data.conversation) {
        expect(response.body.data.conversation.state).toBe('ALLOCATED');
        expect(response.body.data.conversation.assigned_operator_id).toBe(1);
      }
    });

    it('should fail for offline operator', async () => {
      // Set operator offline
      await request(app)
        .put('/api/v1/operators/2/status')
        .set('X-Operator-Id', '2')
        .send({ status: 'OFFLINE' })
        .expect(200);

      // Try to allocate
      const response = await request(app)
        .post('/api/v1/conversations/allocate')
        .set('X-Operator-Id', '2')
        .send({ operator_id: 2 })
        .expect(400);

      expect(response.body.message).toContain('not available');
    });

    it('should require operator_id', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/allocate')
        .set('X-Operator-Id', '1')
        .send({})
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/v1/conversations/resolve', () => {
    let allocatedConversationId;

    beforeEach(async () => {
      // Allocate a conversation first
      const allocateResponse = await request(app)
        .post('/api/v1/conversations/allocate')
        .set('X-Operator-Id', '1')
        .send({ operator_id: 1 });

      if (allocateResponse.body.data?.conversation) {
        allocatedConversationId = allocateResponse.body.data.conversation.id;
      }
    });

    it('should resolve allocated conversation', async () => {
      if (!allocatedConversationId) {
        return; // Skip if no conversation was allocated
      }

      const response = await request(app)
        .post('/api/v1/conversations/resolve')
        .set('X-Operator-Id', '1')
        .send({ conversation_id: allocatedConversationId })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.conversation.state).toBe('RESOLVED');
    });

    it('should not allow resolving already resolved conversation', async () => {
      if (!allocatedConversationId) {
        return;
      }

      // Resolve once
      await request(app)
        .post('/api/v1/conversations/resolve')
        .set('X-Operator-Id', '1')
        .send({ conversation_id: allocatedConversationId });

      // Try to resolve again
      const response = await request(app)
        .post('/api/v1/conversations/resolve')
        .set('X-Operator-Id', '1')
        .send({ conversation_id: allocatedConversationId })
        .expect(400);

      expect(response.body.message).toContain('already resolved');
    });
  });

  describe('Operator Status Management', () => {
    it('should get operator status', async () => {
      const response = await request(app)
        .get('/api/v1/operators/1/status')
        .set('X-Operator-Id', '1')
        .expect(200);

      expect(response.body.data.status).toHaveProperty('operator_id', 1);
      expect(response.body.data.status).toHaveProperty('status');
    });

    it('should update operator status', async () => {
      const response = await request(app)
        .put('/api/v1/operators/1/status')
        .set('X-Operator-Id', '1')
        .send({ status: 'AVAILABLE' })
        .expect(200);

      expect(response.body.data.status.status).toBe('AVAILABLE');
    });

    it('should validate status values', async () => {
      const response = await request(app)
        .put('/api/v1/operators/1/status')
        .set('X-Operator-Id', '1')
        .send({ status: 'INVALID_STATUS' })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('Label Management', () => {
    it('should list labels for inbox', async () => {
      const response = await request(app)
        .get('/api/v1/labels?inbox_id=1')
        .set('X-Operator-Id', '1')
        .expect(200);

      expect(Array.isArray(response.body.data.labels)).toBe(true);
    });

    it('should create new label', async () => {
      const response = await request(app)
        .post('/api/v1/labels')
        .set('X-Operator-Id', '1')
        .send({
          inbox_id: 1,
          name: 'Test Label',
          color: '#FF0000',
          created_by: 1
        })
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data.label.name).toBe('Test Label');
    });

    it('should validate color format', async () => {
      const response = await request(app)
        .post('/api/v1/labels')
        .set('X-Operator-Id', '1')
        .send({
          inbox_id: 1,
          name: 'Test Label',
          color: 'invalid-color',
          created_by: 1
        })
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('Authorization', () => {
    it('should allow manager to deallocate', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/deallocate')
        .set('X-Operator-Id', '3') // Manager
        .send({ conversation_id: 5 });

      // Should not be forbidden
      expect(response.status).not.toBe(403);
    });

    it('should not allow operator to deallocate', async () => {
      const response = await request(app)
        .post('/api/v1/conversations/deallocate')
        .set('X-Operator-Id', '1') // Operator
        .send({ conversation_id: 5 })
        .expect(403);

      expect(response.body.message).toContain('permission');
    });
  });

  describe('Search', () => {
    it('should search by phone number', async () => {
      const response = await request(app)
        .get('/api/v1/conversations/search?phone_number=%2B19876543211')
        .set('X-Operator-Id', '1')
        .expect(200);

      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });

    it('should require phone_number parameter', async () => {
      const response = await request(app)
        .get('/api/v1/conversations/search')
        .set('X-Operator-Id', '1')
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });
});
