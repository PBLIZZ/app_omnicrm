import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInteractionService,
  getInteractionByIdService,
  listInteractionsService,
  updateInteractionService,
  deleteInteractionService,
} from "../interactions.service";
import { createInteractionsRepository } from "@repo";
import { getDb } from "@/server/db/client";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@repo");
vi.mock("@/server/db/client");

describe("InteractionsService", () => {
  let mockDb: any;
  let mockRepo: any;
  const mockUserId = "user-123";
  const mockContactId = "contact-456";
  const mockInteractionId = "interaction-789";

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {};
    mockRepo = {
      createInteraction: vi.fn(),
      getInteractionById: vi.fn(),
      listInteractions: vi.fn(),
      updateInteraction: vi.fn(),
      deleteInteraction: vi.fn(),
      getInteractionsByContactId: vi.fn(),
    };

    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo);
  });

  describe("createInteractionService", () => {
    it("should create a new interaction", async () => {
      const interactionData = {
        contactId: mockContactId,
        type: "email",
        subject: "Test email",
        content: "Test email content",
        direction: "outbound",
        timestamp: new Date(),
      };

      const mockCreatedInteraction = {
        id: mockInteractionId,
        userId: mockUserId,
        ...interactionData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.createInteraction.mockResolvedValue(mockCreatedInteraction);

      const result = await createInteractionService(mockUserId, interactionData);

      expect(result).toEqual(mockCreatedInteraction);
      expect(createInteractionsRepository).toHaveBeenCalledWith(mockDb);
      expect(mockRepo.createInteraction).toHaveBeenCalledWith({
        ...interactionData,
        userId: mockUserId,
      });
    });

    it("should handle database errors", async () => {
      const interactionData = {
        contactId: mockContactId,
        type: "email",
        subject: "Test email",
        content: "Test email content",
        direction: "outbound",
        timestamp: new Date(),
      };

      mockRepo.createInteraction.mockRejectedValue(new Error("Database error"));

      await expect(createInteractionService(mockUserId, interactionData)).rejects.toThrow(AppError);
    });
  });

  describe("getInteractionByIdService", () => {
    it("should return interaction when found", async () => {
      const mockInteraction = {
        id: mockInteractionId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "email",
        subject: "Test email",
        content: "Test email content",
        direction: "outbound",
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.getInteractionById.mockResolvedValue(mockInteraction);

      const result = await getInteractionByIdService(mockUserId, mockInteractionId);

      expect(result).toEqual(mockInteraction);
      expect(mockRepo.getInteractionById).toHaveBeenCalledWith(mockUserId, mockInteractionId);
    });

    it("should return null when interaction not found", async () => {
      mockRepo.getInteractionById.mockResolvedValue(null);

      const result = await getInteractionByIdService(mockUserId, "non-existent");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockRepo.getInteractionById.mockRejectedValue(new Error("Database error"));

      await expect(getInteractionByIdService(mockUserId, mockInteractionId)).rejects.toThrow(
        AppError,
      );
    });
  });

  describe("listInteractionsService", () => {
    it("should return list of interactions with default parameters", async () => {
      const mockInteractions = [
        {
          id: mockInteractionId,
          userId: mockUserId,
          contactId: mockContactId,
          type: "email",
          subject: "Test email",
          content: "Test email content",
          direction: "outbound",
          timestamp: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepo.listInteractions.mockResolvedValue(mockInteractions);

      const result = await listInteractionsService(mockUserId);

      expect(result).toEqual(mockInteractions);
      expect(mockRepo.listInteractions).toHaveBeenCalledWith(mockUserId, {});
    });

    it("should filter interactions by contactId", async () => {
      const mockInteractions = [];
      mockRepo.listInteractions.mockResolvedValue(mockInteractions);

      const result = await listInteractionsService(mockUserId, { contactId: mockContactId });

      expect(result).toEqual(mockInteractions);
      expect(mockRepo.listInteractions).toHaveBeenCalledWith(mockUserId, {
        contactId: mockContactId,
      });
    });

    it("should filter interactions by type", async () => {
      const mockInteractions = [];
      mockRepo.listInteractions.mockResolvedValue(mockInteractions);

      const result = await listInteractionsService(mockUserId, { type: "email" });

      expect(result).toEqual(mockInteractions);
      expect(mockRepo.listInteractions).toHaveBeenCalledWith(mockUserId, { type: "email" });
    });

    it("should handle database errors", async () => {
      mockRepo.listInteractions.mockRejectedValue(new Error("Database error"));

      await expect(listInteractionsService(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe("updateInteractionService", () => {
    it("should update an existing interaction", async () => {
      const updateData = {
        subject: "Updated subject",
        content: "Updated content",
      };

      const mockUpdatedInteraction = {
        id: mockInteractionId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "email",
        subject: "Updated subject",
        content: "Updated content",
        direction: "outbound",
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepo.updateInteraction.mockResolvedValue(mockUpdatedInteraction);

      const result = await updateInteractionService(mockUserId, mockInteractionId, updateData);

      expect(result).toEqual(mockUpdatedInteraction);
      expect(mockRepo.updateInteraction).toHaveBeenCalledWith(
        mockUserId,
        mockInteractionId,
        updateData,
      );
    });

    it("should return null when interaction not found for update", async () => {
      const updateData = { subject: "Updated subject" };
      mockRepo.updateInteraction.mockResolvedValue(null);

      const result = await updateInteractionService(mockUserId, "non-existent", updateData);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      const updateData = { subject: "Updated subject" };
      mockRepo.updateInteraction.mockRejectedValue(new Error("Database error"));

      await expect(
        updateInteractionService(mockUserId, mockInteractionId, updateData),
      ).rejects.toThrow(AppError);
    });
  });

  describe("deleteInteractionService", () => {
    it("should delete an existing interaction", async () => {
      mockRepo.deleteInteraction.mockResolvedValue();

      await deleteInteractionService(mockUserId, mockInteractionId);

      expect(mockRepo.deleteInteraction).toHaveBeenCalledWith(mockUserId, mockInteractionId);
    });

    it("should not throw when deleting interaction", async () => {
      mockRepo.deleteInteraction.mockResolvedValue();

      await expect(deleteInteractionService(mockUserId, "non-existent")).resolves.not.toThrow();
    });

    it("should handle database errors", async () => {
      mockRepo.deleteInteraction.mockRejectedValue(new Error("Database error"));

      await expect(deleteInteractionService(mockUserId, mockInteractionId)).rejects.toThrow(
        AppError,
      );
    });
  });
});
