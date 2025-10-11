import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createInteractionService,
  getInteractionByIdService,
  listInteractionsService,
  updateInteractionService,
  deleteInteractionService,
  findInteractionBySourceService,
  createInteractionsBulkService,
  countInteractionsService,
  getInteractionTypeBreakdownService,
  getLatestInteractionForContactService,
} from "../interactions.service";
import { createInteractionsRepository } from "@repo";
import * as dbClient from "@/server/db/client";

vi.mock("@repo");
vi.mock("@/server/db/client");

describe("InteractionsService", () => {
  const userId = "user-1";
  const interactionId = "i-1";
  let mockRepo: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = {
      createInteraction: vi.fn(),
      getInteractionById: vi.fn(),
      listInteractions: vi.fn(),
      updateInteraction: vi.fn(),
      deleteInteraction: vi.fn(),
      findBySource: vi.fn(),
      createInteractionsBulk: vi.fn(),
      countInteractions: vi.fn(),
      getTypeBreakdown: vi.fn(),
      latestInteractionForContact: vi.fn(),
    };
    vi.mocked(dbClient.getDb).mockResolvedValue({} as any);
    vi.mocked(createInteractionsRepository).mockReturnValue(mockRepo);
  });

  it("createInteractionService delegates and returns created", async () => {
    const created = { id: interactionId } as any;
    mockRepo.createInteraction.mockResolvedValue(created);
    const result = await createInteractionService(userId, {
      contactId: null,
      type: "email",
      occurredAt: new Date(),
      createdAt: new Date(),
    } as any);
    expect(result).toBe(created);
  });

  it("getInteractionByIdService delegates", async () => {
    mockRepo.getInteractionById.mockResolvedValue({ id: interactionId } as any);
    const result = await getInteractionByIdService(userId, interactionId);
    expect(result?.id).toBe(interactionId);
  });

  it("listInteractionsService forwards params", async () => {
    mockRepo.listInteractions.mockResolvedValue({ items: [], total: 0 });
    const res = await listInteractionsService(userId, { page: 2, pageSize: 10 });
    expect(mockRepo.listInteractions).toHaveBeenCalledWith(userId, { page: 2, pageSize: 10 });
    expect(res).toEqual({ items: [], total: 0 });
  });

  it("updateInteractionService delegates", async () => {
    mockRepo.updateInteraction.mockResolvedValue({ id: interactionId } as any);
    const res = await updateInteractionService(userId, interactionId, { subject: "Hi" } as any);
    expect(res?.id).toBe(interactionId);
  });

  it("deleteInteractionService delegates", async () => {
    mockRepo.deleteInteraction.mockResolvedValue(undefined);
    await deleteInteractionService(userId, interactionId);
    expect(mockRepo.deleteInteraction).toHaveBeenCalledWith(userId, interactionId);
  });

  it("findInteractionBySourceService delegates", async () => {
    mockRepo.findBySource.mockResolvedValue({ id: interactionId } as any);
    const res = await findInteractionBySourceService(userId, "gmail", "msg-1");
    expect(res?.id).toBe(interactionId);
  });

  it("createInteractionsBulkService delegates", async () => {
    mockRepo.createInteractionsBulk.mockResolvedValue([{ id: interactionId }] as any);
    const res = await createInteractionsBulkService(userId, [
      { type: "email", occurredAt: new Date(), createdAt: new Date() } as any,
    ]);
    expect(Array.isArray(res)).toBe(true);
    expect(res[0].id).toBe(interactionId);
  });

  it("countInteractionsService delegates", async () => {
    mockRepo.countInteractions.mockResolvedValue(5);
    const count = await countInteractionsService(userId, { contactId: "c-1" });
    expect(count).toBe(5);
  });

  it("getInteractionTypeBreakdownService delegates", async () => {
    const breakdown = [{ type: "email", total: 3 }];
    mockRepo.getTypeBreakdown.mockResolvedValue(breakdown);
    const res = await getInteractionTypeBreakdownService(userId);
    expect(res).toBe(breakdown);
  });

  it("getLatestInteractionForContactService delegates", async () => {
    mockRepo.latestInteractionForContact.mockResolvedValue({ id: interactionId } as any);
    const res = await getLatestInteractionForContactService(userId, "contact-1");
    expect(res?.id).toBe(interactionId);
  });
});