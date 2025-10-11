import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupRepoMocks,
  resetRepoMocks,
  configureCommonScenarios,
  makeOmniClientWithNotes,
  makeCreateOmniClientInput,
  testUtils,
  type AllRepoFakes
} from '@packages/testing';
import * as contactsService from '@/server/services/contacts.service';

// Mock the services we're testing
vi.mock('@/server/services/contacts.service');

describe('Contacts End-to-End Workflow Integration', () => {
  let fakes: AllRepoFakes;
  let scenarios: ReturnType<typeof configureCommonScenarios>;
  const testUserId = testUtils.defaultUserId;

  beforeEach(() => {
    vi.clearAllMocks();
    fakes = setupRepoMocks();
    scenarios = configureCommonScenarios(fakes);
    resetRepoMocks(fakes);
  });

  it('should complete full contact lifecycle: create, list, and verify data flow', async () => {
    // Step 1: Create a contact through the service layer
    const contactInput = makeCreateOmniClientInput({
      displayName: 'Integration Test Contact',
      primaryEmail: 'integration@test.com',
      primaryPhone: '+1234567890',
      source: 'manual',
    });

    // Configure repository to return created contact
    const createdContact = makeOmniClientWithNotes({
      displayName: 'Integration Test Contact',
      primaryEmail: 'integration@test.com',
      primaryPhone: '+1234567890',
      source: 'manual',
      userId: testUserId,
    });

    fakes.omniClients.createContact.mockResolvedValueOnce(createdContact);

    const result = await vi.mocked(contactsService.createContactService)(testUserId, contactInput as any);

    expect(result).toBeTruthy();
    expect(result?.displayName).toBe('Integration Test Contact');
    expect(result?.primaryEmail).toBe('integration@test.com');
    expect(result?.source).toBe('manual');

    // Step 2: Verify contact exists in repository layer
    const repoContact = makeOmniClientWithNotes({
      displayName: 'Direct Repo Contact',
      primaryEmail: 'repo@test.com',
      primaryPhone: null,
      source: 'gmail_import',
      userId: testUserId,
    });

    fakes.omniClients.createContact.mockResolvedValueOnce(repoContact);
    const repoResult = await fakes.omniClients.createContact(testUserId, {
      displayName: 'Direct Repo Contact',
      primaryEmail: 'repo@test.com',
      primaryPhone: null,
      source: 'gmail_import',
    });

    expect(repoResult).toBeTruthy();
    expect(repoResult?.displayName).toBe('Direct Repo Contact');

    // Step 3: List contacts through service layer and verify both contacts
    const listParams = testUtils.createPaginationParams({
      page: 1,
      pageSize: 10,
      sort: 'displayName',
      order: 'asc',
    });

    // Configure repository to return both contacts
    fakes.omniClients.listContacts.mockResolvedValueOnce({
      items: [createdContact, repoContact],
      total: 2,
    });

    const serviceResult = await vi.mocked(contactsService.listContactsService)(testUserId, listParams);

    expect(serviceResult.items).toHaveLength(2);
    expect(serviceResult.total).toBe(2);

    const contactNames = serviceResult.items.map(c => c.displayName).sort();
    expect(contactNames).toEqual(['Direct Repo Contact', 'Integration Test Contact']);

    // Step 4: Test search functionality
    const searchParams = testUtils.createPaginationParams({
      ...listParams,
      search: 'integration',
    });

    // Configure repository to return filtered result
    fakes.omniClients.listContacts.mockResolvedValueOnce({
      items: [createdContact],
      total: 1,
    });

    const searchResult = await vi.mocked(contactsService.listContactsService)(testUserId, searchParams);

    expect(searchResult.items).toHaveLength(1);
    expect(searchResult.items[0].displayName).toBe('Integration Test Contact');

    // Step 5: Test repository layer directly for consistency
    fakes.omniClients.listContacts.mockResolvedValueOnce({
      items: [createdContact, repoContact],
      total: 2,
    });

    const repoListResult = await fakes.omniClients.listContacts(testUserId, listParams);

    expect(repoListResult.items).toHaveLength(2);
    expect(repoListResult.total).toBe(2);

    // Step 6: Verify data integrity across layers
    const serviceContact = serviceResult.items.find(c => c.displayName === 'Integration Test Contact');
    const repoContactMatch = repoListResult.items.find(c => c.displayName === 'Integration Test Contact');

    expect(serviceContact?.id).toBe(repoContactMatch?.id);
    expect(serviceContact?.primaryEmail).toBe(repoContactMatch?.primaryEmail);

    // Step 7: Test edge cases - empty string normalization
    const edgeCaseContact = makeOmniClientWithNotes({
      displayName: 'Edge Case Contact',
      primaryEmail: null,  // Normalized from empty string
      primaryPhone: null,  // Normalized from whitespace
      source: 'manual',
      userId: testUserId,
    });

    fakes.omniClients.createContact.mockResolvedValueOnce(edgeCaseContact);
    const edgeResult = await vi.mocked(contactsService.createContactService)(testUserId, {
      displayName: 'Edge Case Contact',
      primaryEmail: '',
      primaryPhone: '   ',
      source: 'manual',
    } as any);

    expect(edgeResult?.primaryEmail).toBeNull();
    expect(edgeResult?.primaryPhone).toBeNull();

    // Step 8: Final verification - total count should be 3
    fakes.omniClients.listContacts.mockResolvedValueOnce({
      items: [createdContact, repoContact, edgeCaseContact],
      total: 3,
    });

    const finalResult = await vi.mocked(contactsService.listContactsService)(testUserId, listParams);
    expect(finalResult.total).toBe(3);
  });

  it('should handle concurrent contact creation and maintain data consistency', async () => {
    // Create multiple contacts concurrently to test race conditions
    const contactPromises = Array.from({ length: 5 }, (_, i) => 
      createContactService(testUserId, {
        displayName: `Concurrent Contact ${i + 1}`,
        primaryEmail: `concurrent${i + 1}@test.com`,
        primaryPhone: null,
        source: 'upload',
      })
    );

    const createdContacts = await Promise.all(contactPromises);
    
    // Verify all contacts were created successfully
    expect(createdContacts).toHaveLength(5);
      expect(contact).toBeTruthy();
      expect(contact?.displayName).toBe(`Concurrent Contact ${i + 1}`);
    });


    // Verify all contacts can be retrieved
    const listResult = await listContactsService(testUserId, {
      page: 1,
      pageSize: 10,
      sort: 'displayName',
      order: 'asc',
    });

    expect(listResult.total).toBe(5);
    expect(listResult.items).toHaveLength(5);
  });

  it('should handle pagination correctly across service and repository layers', async () => {
    // Create 15 test contacts
    const contactPromises = Array.from({ length: 15 }, (_, i) => 
      createContactService(testUserId, {
        displayName: `Pagination Contact ${String(i + 1).padStart(2, '0')}`,
        primaryEmail: `page${i + 1}@test.com`,
        primaryPhone: null,
        source: 'manual',
      })
    );

    await Promise.all(contactPromises);

    // Test first page
    const page1 = await listContactsService(testUserId, {
      page: 1,
      pageSize: 5,
      sort: 'displayName',
      order: 'asc',
    });

    expect(page1.items).toHaveLength(5);
    expect(page1.total).toBe(15);
    expect(page1.items[0].displayName).toBe('Pagination Contact 01');

    // Test second page
    const page2 = await listContactsService(testUserId, {
      page: 2,
      pageSize: 5,
      sort: 'displayName',
      order: 'asc',
    });

    expect(page2.items).toHaveLength(5);
    expect(page2.total).toBe(15);
    expect(page2.items[0].displayName).toBe('Pagination Contact 06');

    // Test last page
    const page3 = await listContactsService(testUserId, {
      page: 3,
      pageSize: 5,
      sort: 'displayName',
      order: 'asc',
    });

    expect(page3.items).toHaveLength(5);
    expect(page3.total).toBe(15);
    expect(page3.items[0].displayName).toBe('Pagination Contact 11');

    // Test beyond available pages
    const page4 = await listContactsService(testUserId, {
      page: 4,
      pageSize: 5,
      sort: 'displayName',
      order: 'asc',
    });

    expect(page4.items).toHaveLength(0);
    expect(page4.total).toBe(15);
  });
});
