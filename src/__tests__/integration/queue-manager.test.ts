import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueManager, type BatchJob } from '@/server/jobs/queue-manager';
import { enqueue } from '@/server/jobs/enqueue';

// Mock the enqueue function to avoid actual job creation
vi.mock('@/server/jobs/enqueue', () => ({
  enqueue: vi.fn().mockImplementation(async (kind: string, payload: Record<string, unknown>, userId: string, batchId?: string) => {
    // Return a mock job ID instead of creating real database entries
    return `mock-job-id-${Date.now()}`;
  }),
}));

// Mock logger to avoid noise in tests
vi.mock('@/lib/observability', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('QueueManager Integration Tests', () => {
  const testUserId = 'test-user-queue-integration';
  let queueManager: QueueManager;
  const mockEnqueue = vi.mocked(enqueue);

  beforeEach(() => {
    vi.clearAllMocks();
    queueManager = new QueueManager();
  });

  describe('enqueueBatchJob', () => {
    it('should enqueue multiple jobs as a batch', async () => {
      const batchJobs: BatchJob[] = [
        {
          payload: { contactId: 'contact-1', type: 'summary' },
          options: { priority: 'high' },
        },
        {
          payload: { contactId: 'contact-2', type: 'summary' },
          options: { priority: 'medium' },
        },
      ];

      const jobIds = await queueManager.enqueueBatchJob(testUserId, 'insight', batchJobs);

      expect(jobIds).toHaveLength(2);
      expect(mockEnqueue).toHaveBeenCalledTimes(2);

      // Verify all jobs were enqueued with the same batchId
      const calls = mockEnqueue.mock.calls;
      expect(calls[0][3]).toBeDefined(); // First call has batchId
      expect(calls[1][3]).toBe(calls[0][3]); // Second call has same batchId
    });

    it('should generate unique batch IDs for different batches', async () => {
      const batch1: BatchJob[] = [{ payload: { test: 'data1' } }];
      const batch2: BatchJob[] = [{ payload: { test: 'data2' } }];

      const [jobIds1, jobIds2] = await Promise.all([
        queueManager.enqueueBatchJob(testUserId, 'insight', batch1),
        queueManager.enqueueBatchJob(testUserId, 'insight', batch2),
      ]);

      expect(jobIds1).toHaveLength(1);
      expect(jobIds2).toHaveLength(1);

      // Verify different batch IDs were used by checking mock calls
      const calls = mockEnqueue.mock.calls;
      expect(calls[0][3]).toBeDefined(); // First batch has batchId
      expect(calls[1][3]).toBeDefined(); // Second batch has batchId
      expect(calls[0][3]).not.toBe(calls[1][3]); // Different batchIds
    });

    it('should handle empty batch', async () => {
      const jobIds = await queueManager.enqueueBatchJob(testUserId, 'insight', []);

      expect(jobIds).toHaveLength(0);
      expect(mockEnqueue).not.toHaveBeenCalled();
    });
  });

  describe('getBatchStatus', () => {
    it('should return batch status for valid batch ID', async () => {
      const batchId = 'test-batch-completed';

      // The getBatchStatus method will use our mocked database
      // which returns empty arrays, so we test it just calls without error
      const status = await queueManager.getBatchStatus(batchId);

      // With our mock setup, this should not throw and return a status object
      expect(status).toBeDefined();
    });

    it('should handle non-existent batch gracefully', async () => {
      const status = await queueManager.getBatchStatus('non-existent-batch');
      // With our mock setup returning empty arrays, this should handle gracefully
      expect(status).toBeDefined();
    });
  });

  describe('cancelBatch', () => {
    it('should handle batch cancellation', async () => {
      const batchId = 'test-batch-cancel';

      // With our mock setup, this should not throw and should handle gracefully
      const cancelledCount = await queueManager.cancelBatch(batchId, testUserId);

      expect(typeof cancelledCount).toBe('number');
    });
  });

  describe('getJobStats', () => {
    it('should return job statistics', async () => {
      // With our mock database returning empty arrays, this should not throw
      const stats = await queueManager.getJobStats(testUserId);

      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });
});