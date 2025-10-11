/**
 * Unit Tests for OnboardingRepository Photo Upload Feature
 *
 * Tests the new client_files integration for photo uploads during onboarding
 * Focuses on the submitClientOnboarding method changes
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OnboardingRepository } from "./onboarding.repo";
import * as dbClient from "@/server/db/client";

// Mock dependencies
vi.mock("@/server/db/client");

describe("OnboardingRepository - Photo Upload Integration", () => {
  const mockUserId = "user-123";
  const mockTokenId = "token-456";
  const mockContactId = "contact-789";

  const mockClientData = {
    display_name: "John Wellness",
    primary_email: "john@wellness.com",
    primary_phone: "+1234567890",
    date_of_birth: "1990-01-01",
    emergency_contact_name: "Jane Doe",
    emergency_contact_phone: "+0987654321",
    address: { street: "123 Wellness St", city: "Zen City" },
    health_context: { conditions: ["healthy"] },
    preferences: { notifications: true },
  };

  const mockConsentData = {
    privacy_policy: true,
    terms_of_service: true,
    data_sharing: false,
    marketing_communications: true,
  };

  const createMockDb = () => {
    const mockTransaction = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
    };

    return {
      transaction: vi.fn().mockImplementation(async (callback) => {
        return callback(mockTransaction);
      }),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("submitClientOnboarding - with photo", () => {
    it("should create contact with photo and client_files record", async () => {
      const photoPath = "client-photos/user-123/photo.webp";
      const photoSize = 51200; // 50KB
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: photoPath,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      // Mock the transaction to use our mockTrx
      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        // First call: insert contact (photoUrl: null initially)
        mockTrx.returning.mockResolvedValueOnce([{ ...mockContact, photoUrl: null }]);
        
        // Second call: insert client_files
        mockTrx.returning.mockResolvedValueOnce([{ id: "file-1" }]);
        
        // Third call: update contact with photoUrl
        mockTrx.returning.mockResolvedValueOnce([mockContact]);
        
        // Fourth call: insert consent
        mockTrx.returning.mockResolvedValueOnce([{ id: "consent-1" }]);
        
        // Fifth call: update token
        mockTrx.returning.mockResolvedValueOnce([{ id: mockTokenId }]);

        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        photoSize,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }

      // Verify client_files insert was called
      expect(mockTrx.insert).toHaveBeenCalled();
      expect(mockTrx.values).toHaveBeenCalledWith(
        expect.objectContaining({
          contactId: mockContactId,
          userId: mockUserId,
          filePath: photoPath,
          mimeType: "image/webp",
          fileSize: photoSize,
          fileType: "photo",
        }),
      );
    });

    it("should create contact without photo when photoPath is null", async () => {
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: null,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        undefined, // No photo
        undefined,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }

      // Verify client_files was NOT created
      const insertCalls = mockTrx.insert.mock.calls;
      const clientFilesCall = insertCalls.find((call: any) => {
        const tableName = call[0]?.name || call[0]?.toString();
        return tableName?.includes('clientFiles') || tableName?.includes('client_files');
      });
      expect(clientFilesCall).toBeUndefined();
    });

    it("should handle photoSize as null gracefully", async () => {
      const photoPath = "client-photos/user-123/photo.webp";
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: photoPath,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        undefined, // No size provided
      );

      expect(result.success).toBe(true);

      // Verify fileSize is null in client_files
      expect(mockTrx.values).toHaveBeenCalledWith(
        expect.objectContaining({
          fileSize: null,
        }),
      );
    });

    it("should set mimeType to image/webp for optimized photos", async () => {
      const photoPath = "client-photos/user-123/optimized.webp";
      const photoSize = 45000;
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: photoPath,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        photoSize,
      );

      // Verify mimeType is set to image/webp (photos are optimized)
      expect(mockTrx.values).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: "image/webp",
        }),
      );
    });

    it("should update contact photoUrl after creating client_files", async () => {
      const photoPath = "client-photos/user-123/photo.webp";
      const photoSize = 51200;
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: null,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        // Track call order
        let callCount = 0;
        
        mockTrx.returning.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            // Contact creation - photoUrl is null initially
            return Promise.resolve([{ ...mockContact, photoUrl: null }]);
          } else if (callCount === 2) {
            // client_files creation
            return Promise.resolve([{ id: "file-1" }]);
          } else if (callCount === 3) {
            // Contact update - photoUrl now set
            return Promise.resolve([{ ...mockContact, photoUrl: photoPath }]);
          }
          return Promise.resolve([{ id: "other" }]);
        });

        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        photoSize,
      );

      // Verify update was called to set photoUrl
      expect(mockTrx.update).toHaveBeenCalled();
      expect(mockTrx.set).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: photoPath,
        }),
      );
    });
  });

  describe("submitClientOnboarding - transaction integrity", () => {
    it("should rollback transaction if contact creation fails", async () => {
      const mockDb = createMockDb();
      const mockError = new Error("Contact creation failed");

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        const mockTrx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockRejectedValue(mockError),
        };
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });

    it("should rollback if client_files creation fails", async () => {
      const photoPath = "client-photos/user-123/photo.webp";
      const photoSize = 51200;
      const mockDb = createMockDb();

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        let callCount = 0;
        const mockTrx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // Contact creation succeeds
              return Promise.resolve([{ id: mockContactId }]);
            } else if (callCount === 2) {
              // client_files creation fails
              return Promise.reject(new Error("File record creation failed"));
            }
            return Promise.resolve([]);
          }),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        };
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        photoSize,
      );

      expect(result.success).toBe(false);
    });

    it("should rollback if photoUrl update fails", async () => {
      const photoPath = "client-photos/user-123/photo.webp";
      const photoSize = 51200;
      const mockDb = createMockDb();

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        let callCount = 0;
        const mockTrx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // Contact creation succeeds
              return Promise.resolve([{ id: mockContactId }]);
            } else if (callCount === 2) {
              // client_files creation succeeds
              return Promise.resolve([{ id: "file-1" }]);
            }
            return Promise.resolve([]);
          }),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        };

        // Make update fail
        mockTrx.returning.mockRejectedValueOnce(new Error("Update failed"));

        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        photoSize,
      );

      expect(result.success).toBe(false);
    });
  });

  describe("submitClientOnboarding - data validation", () => {
    it("should handle various photo file sizes", async () => {
      const testCases = [
        { size: 1024, description: "1KB" },
        { size: 51200, description: "50KB" },
        { size: 102400, description: "100KB" },
        { size: 512000, description: "500KB" },
      ];

      for (const testCase of testCases) {
        const mockDb = createMockDb();
        const mockTrx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: mockContactId }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
        };

        mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
          return callback(mockTrx);
        });

        vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

        const result = await OnboardingRepository.submitClientOnboarding(
          mockUserId,
          mockTokenId,
          mockClientData,
          mockConsentData,
          "photo.webp",
          testCase.size,
        );

        expect(result.success).toBe(true);
        
        // Verify fileSize was recorded
        const valuesCall = mockTrx.values.mock.calls.find((call: any) => 
          call[0]?.fileSize !== undefined
        );
        expect(valuesCall).toBeDefined();
        expect(valuesCall[0].fileSize).toBe(testCase.size);

        vi.clearAllMocks();
      }
    });

    it("should use file path as photoUrl", async () => {
      const photoPath = "client-photos/user-123/unique-photo.webp";
      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: mockContactId }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        photoPath,
        51200,
      );

      // Verify photoUrl matches file path
      const updateCall = mockTrx.set.mock.calls.find((call: any) => 
        call[0]?.photoUrl !== undefined
      );
      expect(updateCall).toBeDefined();
      expect(updateCall[0].photoUrl).toBe(photoPath);
    });

    it("should set fileType to photo for client photos", async () => {
      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ id: mockContactId }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
        "photo.webp",
        51200,
      );

      // Verify fileType is "photo"
      const valuesCall = mockTrx.values.mock.calls.find((call: any) => 
        call[0]?.fileType !== undefined
      );
      expect(valuesCall).toBeDefined();
      expect(valuesCall[0].fileType).toBe("photo");
    });
  });

  describe("submitClientOnboarding - backward compatibility", () => {
    it("should work without photo parameters (legacy behavior)", async () => {
      const mockContact = {
        id: mockContactId,
        userId: mockUserId,
        displayName: mockClientData.display_name,
        photoUrl: null,
      };

      const mockDb = createMockDb();
      const mockTrx = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockContact]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      mockDb.transaction = vi.fn().mockImplementation(async (callback) => {
        return callback(mockTrx);
      });

      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      // Call without photo parameters
      const result = await OnboardingRepository.submitClientOnboarding(
        mockUserId,
        mockTokenId,
        mockClientData,
        mockConsentData,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });
  });
});