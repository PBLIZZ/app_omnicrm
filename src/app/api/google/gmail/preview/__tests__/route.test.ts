import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getGoogleGmailClient } from '@/server/google/client';
import { SyncPreviewResponseSchema } from '@/lib/validation/schemas/sync';

// Mock dependencies
vi.mock('@/server/google/client');
vi.mock('@/server/api/handler', () => ({
  createRouteHandler: (config: any) => (handler: any) => handler,
}));
vi.mock('@/server/api/response', () => {
  const { NextResponse } = require('next/server');
  return {
    ApiResponseBuilder: vi.fn().mockImplementation((operation, requestId) => ({
      success: vi.fn().mockImplementation((data) => {
        const response = {
          ok: true,
          data,
          timestamp: new Date().toISOString(),
        };
        return NextResponse.json(response, { status: 200 });
      }),
      error: vi.fn().mockImplementation((message, code, details, error) => {
        const response = {
          ok: false,
          error: message,
          code,
          details,
          timestamp: new Date().toISOString(),
          requestId,
        };
        return NextResponse.json(response, { status: 500 });
      }),
    })),
  };
});
vi.mock('@/lib/validation/schemas/sync', () => ({
  GmailPreferencesSchema: {
    safeParse: vi.fn(),
  },
  SyncPreviewResponseSchema: {
    safeParse: vi.fn(),
  },
}));

describe('/api/google/gmail/preview API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/google/gmail/preview', () => {
    it('should generate preview for Gmail sync with valid preferences', async () => {
      const mockPreferences = {
        timeRangeDays: 30,
        importEverything: true,
      };

      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                resultSizeEstimate: 1500,
              },
            }),
          },
        },
      };

      const mockValidationResult = {
        success: true,
        data: {
          service: 'gmail',
          estimatedItems: 1500,
          estimatedSizeMB: 73.24,
          dateRange: {
            start: expect.any(String),
            end: expect.any(String),
          },
          details: {
            emailCount: 1500,
          },
          warnings: [],
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
      vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: mockPreferences,
        },
      };

      const response = await POST(mockContext as any);

      expect(getGoogleGmailClient).toHaveBeenCalledWith('user-123');
      expect(mockGmailClient.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'newer_than:30d',
        maxResults: 1,
      });
      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body.data.service).toBe('gmail');
      expect(body.data.estimatedItems).toBe(1500);
      expect(body.data.estimatedSizeMB).toBe(73.24);
    });

    it('should return error when Gmail is not connected', async () => {
      vi.mocked(getGoogleGmailClient).mockResolvedValue(null);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 30,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(false);
      const body = await response.json();
      expect(body.code).toBe('INTEGRATION_ERROR');
      expect(body.error).toBe('Gmail not connected');
    });

    it('should generate warnings for large sync operations', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                resultSizeEstimate: 15000, // Large number of messages
              },
            }),
          },
        },
      };

      const mockValidationResult = {
        success: true,
        data: {
          service: 'gmail',
          estimatedItems: 15000,
          estimatedSizeMB: 732.42,
          dateRange: {
            start: expect.any(String),
            end: expect.any(String),
          },
          details: {
            emailCount: 15000,
          },
          warnings: [
            'Large sync operation detected. This may take several hours to complete.',
            'Estimated sync size exceeds 500MB. Consider reducing the time range.',
          ],
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
      vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 365,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body.data.warnings).toContain('Large sync operation detected. This may take several hours to complete.');
      expect(body.data.warnings).toContain('Estimated sync size exceeds 500MB. Consider reducing the time range.');
    });

    it('should build correct Gmail query for selective import', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                resultSizeEstimate: 500,
              },
            }),
          },
        },
      };

      const mockValidationResult = {
        success: true,
        data: {
          service: 'gmail',
          estimatedItems: 500,
          estimatedSizeMB: 24.41,
          dateRange: {
            start: expect.any(String),
            end: expect.any(String),
          },
          details: {
            emailCount: 500,
          },
          warnings: [],
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
      vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 7,
            importEverything: false,
          },
        },
      };

      await POST(mockContext as any);

      expect(mockGmailClient.users.messages.list).toHaveBeenCalledWith({
        userId: 'me',
        q: 'newer_than:7d category:primary -in:chats -in:drafts',
        maxResults: 1,
      });
    });

    it('should handle Gmail API authorization errors', async () => {
      const authError = new Error('invalid_grant');
      vi.mocked(getGoogleGmailClient).mockRejectedValue(authError);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 30,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(false);
      const body = await response.json();
      expect(body.code).toBe('INTEGRATION_ERROR');
      expect(body.error).toBe('Gmail authorization expired. Please reconnect.');
    });

    it('should handle Gmail API rate limit errors', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
          },
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 30,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(false);
      const body = await response.json();
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.error).toBe('Rate limit exceeded. Please try again later.');
    });

    it('should handle validation errors in response', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                resultSizeEstimate: 1000,
              },
            }),
          },
        },
      };

      const mockValidationResult = {
        success: false,
        error: {
          issues: [{ message: 'Invalid response format' }],
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
      vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 30,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(false);
      const body = await response.json();
      expect(body.code).toBe('INTERNAL_ERROR');
      expect(body.error).toBe('Invalid preview response generated');
    });

    it('should calculate correct estimated size based on message count', async () => {
      const testCases = [
        { messageCount: 100, expectedSizeMB: 4.88 },
        { messageCount: 1000, expectedSizeMB: 48.83 },
        { messageCount: 5000, expectedSizeMB: 244.14 },
      ];

      for (const testCase of testCases) {
        const mockGmailClient = {
          users: {
            messages: {
              list: vi.fn().mockResolvedValue({
                data: {
                  resultSizeEstimate: testCase.messageCount,
                },
              }),
            },
          },
        };

        const mockValidationResult = {
          success: true,
          data: {
            service: 'gmail',
            estimatedItems: testCase.messageCount,
            estimatedSizeMB: testCase.expectedSizeMB,
            dateRange: {
              start: expect.any(String),
              end: expect.any(String),
            },
            details: {
              emailCount: testCase.messageCount,
            },
            warnings: [],
          },
        };

        vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
        vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

        const mockContext = {
          userId: 'user-123',
          requestId: 'req-123',
          validated: {
            body: {
              timeRangeDays: 30,
              importEverything: true,
            },
          },
        };

        const response = await POST(mockContext as any);

        expect(response.ok).toBe(true);
        const body = await response.json();
        expect(body.data.estimatedSizeMB).toBe(testCase.expectedSizeMB);
      }
    });

    it('should handle zero message count gracefully', async () => {
      const mockGmailClient = {
        users: {
          messages: {
            list: vi.fn().mockResolvedValue({
              data: {
                resultSizeEstimate: 0,
              },
            }),
          },
        },
      };

      const mockValidationResult = {
        success: true,
        data: {
          service: 'gmail',
          estimatedItems: 0,
          estimatedSizeMB: 0,
          dateRange: {
            start: expect.any(String),
            end: expect.any(String),
          },
          details: {
            emailCount: 0,
          },
          warnings: [],
        },
      };

      vi.mocked(getGoogleGmailClient).mockResolvedValue(mockGmailClient as any);
      vi.mocked(SyncPreviewResponseSchema.safeParse).mockReturnValue(mockValidationResult);

      const mockContext = {
        userId: 'user-123',
        requestId: 'req-123',
        validated: {
          body: {
            timeRangeDays: 1,
            importEverything: true,
          },
        },
      };

      const response = await POST(mockContext as any);

      expect(response.ok).toBe(true);
      const body = await response.json();
      expect(body.data.estimatedItems).toBe(0);
      expect(body.data.estimatedSizeMB).toBe(0);
    });
  });
});
