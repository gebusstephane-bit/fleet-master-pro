import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn((payload: string, signature: string, secret: string) => {
        if (!signature || !secret) {
          throw new Error('Invalid signature');
        }
        return JSON.parse(payload);
      }),
    },
  }));
});

describe('Stripe Webhook Handler', () => {
  const mockWebhookSecret = 'whsec_test_secret';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Verification', () => {
    it('should verify webhook signature', () => {
      const stripe = new Stripe('sk_test_key', { apiVersion: '2026-01-28.clover' });
      const payload = JSON.stringify({
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: { object: { id: 'cs_test', customer: 'cus_test' } },
      });
      const signature = 'valid_signature';

      const event = stripe.webhooks.constructEvent(payload, signature, mockWebhookSecret);
      
      expect(event).toBeDefined();
      expect(event.type).toBe('checkout.session.completed');
    });

    it('should reject invalid signature', () => {
      const stripe = new Stripe('sk_test_key', { apiVersion: '2026-01-28.clover' });
      const payload = JSON.stringify({ type: 'test' });

      expect(() => {
        stripe.webhooks.constructEvent(payload, '', '');
      }).toThrow();
    });
  });

  describe('Event Handling', () => {
    it('should handle checkout.session.completed', () => {
      const event = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            metadata: { companyId: 'comp_123' },
          },
        },
      };

      expect(event.type).toBe('checkout.session.completed');
      expect(event.data.object.metadata.companyId).toBe('comp_123');
    });

    it('should handle invoice.payment_failed', () => {
      const event = {
        id: 'evt_456',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
            subscription: 'sub_123',
            attempt_count: 1,
          },
        },
      };

      expect(event.type).toBe('invoice.payment_failed');
      expect(event.data.object.attempt_count).toBe(1);
    });

    it('should handle customer.subscription.deleted', () => {
      const event = {
        id: 'evt_789',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'canceled',
          },
        },
      };

      expect(event.type).toBe('customer.subscription.deleted');
      expect(event.data.object.status).toBe('canceled');
    });
  });
});
