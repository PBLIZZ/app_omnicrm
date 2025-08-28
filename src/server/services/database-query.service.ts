// Database query service for AI assistant
import { contactsStorage } from "@/server/storage/contacts.storage";

export interface DatabaseQueryResult {
  success: boolean;
  data?: any;
  error?: string;
}

export class DatabaseQueryService {
  /**
   * Get the total number of contacts for a user
   */
  static async getContactsCount(userId: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      return {
        success: true,
        data: {
          count: contacts.length,
          message: `You have ${contacts.length} contact${contacts.length === 1 ? '' : 's'} in your CRM.`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch contacts count"
      };
    }
  }

  /**
   * Get a summary of all contacts
   */
  static async getContactsSummary(userId: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      
      const summary = {
        totalContacts: contacts.length,
        contactsWithEmail: contacts.filter(c => c.primaryEmail && c.primaryEmail.trim() !== '').length,
        contactsWithPhone: contacts.filter(c => c.primaryPhone && c.primaryPhone.trim() !== '').length,
        recentContacts: contacts
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(c => ({
            name: c.displayName,
            email: c.primaryEmail,
            createdAt: c.createdAt
          }))
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch contacts summary"
      };
    }
  }

  /**
   * Search contacts by name, email, or phone
   */
  static async searchContacts(userId: string, query: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      const searchTerm = query.toLowerCase();
      
      const matchingContacts = contacts.filter(contact => 
        contact.displayName.toLowerCase().includes(searchTerm) ||
        (contact.primaryEmail && contact.primaryEmail.toLowerCase().includes(searchTerm)) ||
        (contact.primaryPhone && contact.primaryPhone.includes(searchTerm))
      );

      return {
        success: true,
        data: {
          matches: matchingContacts.length,
          contacts: matchingContacts.map(c => ({
            name: c.displayName,
            email: c.primaryEmail,
            phone: c.primaryPhone
          }))
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to search contacts"
      };
    }
  }

  /**
   * Get notes count for a specific contact or all contacts
   */
  static async getNotesInfo(userId: string, contactId?: string): Promise<DatabaseQueryResult> {
    try {
      if (contactId) {
        const notes = await contactsStorage.getNotes(contactId, userId);
        return {
          success: true,
          data: {
            contactId,
            notesCount: notes.length,
            notes: notes.map((n: any) => ({
              content: n.content.substring(0, 100) + (n.content.length > 100 ? '...' : ''),
              createdAt: n.createdAt
            }))
          }
        };
      } else {
        // Get total notes across all contacts
        const contacts = await contactsStorage.getContacts(userId);
        let totalNotes = 0;
        
        for (const contact of contacts) {
          const notes = await contactsStorage.getNotes(contact.id, userId);
          totalNotes += notes.length;
        }

        return {
          success: true,
          data: {
            totalNotes,
            message: `You have ${totalNotes} note${totalNotes === 1 ? '' : 's'} across all contacts.`
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch notes information"
      };
    }
  }

  /**
   * Advanced contact filtering based on query patterns
   */
  static async filterContacts(userId: string, query: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      const normalizedQuery = query.toLowerCase();
      let filteredContacts = contacts;
      let description = "";

      // Pattern: "contacts that begin with [letter]" or "contacts beginning with [letter]"
      const beginsWithMatch = normalizedQuery.match(/(?:contacts?\s+(?:that\s+)?(?:begin|start)(?:s|ning)?\s+with(?:\s+(?:the\s+)?letter)?\s+)([a-z])/i);
      if (beginsWithMatch) {
        const letter = beginsWithMatch[1].toUpperCase();
        filteredContacts = contacts.filter(contact => 
          contact.displayName.toUpperCase().startsWith(letter)
        );
        description = `contacts that begin with "${letter}"`;
      }
      
      // Pattern: "contacts with email" or "contacts that have email"
      else if (normalizedQuery.includes('with email') || normalizedQuery.includes('have email') || normalizedQuery.includes('has email')) {
        filteredContacts = contacts.filter(contact => 
          contact.primaryEmail && contact.primaryEmail.trim() !== ''
        );
        description = "contacts with email addresses";
      }
      
      // Pattern: "contacts with phone" or "contacts that have phone"
      else if (normalizedQuery.includes('with phone') || normalizedQuery.includes('have phone') || normalizedQuery.includes('has phone')) {
        filteredContacts = contacts.filter(contact => 
          contact.primaryPhone && contact.primaryPhone.trim() !== ''
        );
        description = "contacts with phone numbers";
      }
      
      // Pattern: "contacts without email"
      else if (normalizedQuery.includes('without email') || normalizedQuery.includes('no email')) {
        filteredContacts = contacts.filter(contact => 
          !contact.primaryEmail || contact.primaryEmail.trim() === ''
        );
        description = "contacts without email addresses";
      }
      
      // Pattern: "contacts without phone"
      else if (normalizedQuery.includes('without phone') || normalizedQuery.includes('no phone')) {
        filteredContacts = contacts.filter(contact => 
          !contact.primaryPhone || contact.primaryPhone.trim() === ''
        );
        description = "contacts without phone numbers";
      }
      
      // Pattern: "contacts containing [text]" or "contacts with [text] in name"
      else if (normalizedQuery.includes('containing') || normalizedQuery.includes('with') && normalizedQuery.includes('in name')) {
        const containingMatch = normalizedQuery.match(/(?:containing|with)\s+(\w+)(?:\s+in\s+name)?/);
        if (containingMatch) {
          const searchTerm = containingMatch[1];
          filteredContacts = contacts.filter(contact => 
            contact.displayName.toLowerCase().includes(searchTerm.toLowerCase())
          );
          description = `contacts containing "${searchTerm}"`;
        }
      }

      if (description) {
        return {
          success: true,
          data: {
            count: filteredContacts.length,
            description,
            message: `You have ${filteredContacts.length} ${description}.`,
            contacts: filteredContacts.slice(0, 10).map(c => ({
              name: c.displayName,
              email: c.primaryEmail,
              phone: c.primaryPhone
            }))
          }
        };
      }

      // Fallback to general search
      return this.searchContacts(userId, query);
    } catch (error) {
      return {
        success: false,
        error: "Failed to filter contacts"
      };
    }
  }

  /**
   * Get all contact names
   */
  static async getAllContactNames(userId: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      
      return {
        success: true,
        data: {
          contacts: contacts.map(c => ({
            name: c.displayName,
            email: c.primaryEmail,
            phone: c.primaryPhone
          })),
          message: `Here are your ${contacts.length} contacts:\n\n${contacts.map(c => `• ${c.displayName}${c.primaryEmail ? ` (${c.primaryEmail})` : ''}${c.primaryPhone ? ` - ${c.primaryPhone}` : ''}`).join('\n')}`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to fetch contact names"
      };
    }
  }

  /**
   * Get detailed information about a specific contact
   */
  static async getContactDetails(userId: string, contactName: string): Promise<DatabaseQueryResult> {
    try {
      const contacts = await contactsStorage.getContacts(userId);
      const searchTerm = contactName.toLowerCase();
      
      const matchingContact = contacts.find(contact => 
        contact.displayName.toLowerCase().includes(searchTerm) ||
        (contact.primaryEmail && contact.primaryEmail.toLowerCase().includes(searchTerm))
      );

      if (!matchingContact) {
        return {
          success: true,
          data: {
            message: `I couldn't find any contact matching "${contactName}". Try checking the spelling or browse your contacts to see available names.`
          }
        };
      }

      // Format contact details with AI insights
      let contactInfo = `## ${matchingContact.displayName}\n\n`;
      
      // Basic contact info
      if (matchingContact.primaryEmail) {
        contactInfo += `📧 **Email:** ${matchingContact.primaryEmail}\n`;
      }
      if (matchingContact.primaryPhone) {
        contactInfo += `📱 **Phone:** ${matchingContact.primaryPhone}\n`;
      }
      if (matchingContact.source) {
        contactInfo += `📁 **Source:** ${matchingContact.source}\n`;
      }
      
      contactInfo += '\n';

      // AI Insights
      if (matchingContact.stage) {
        contactInfo += `🎯 **Client Stage:** ${matchingContact.stage}\n`;
      }
      
      if (matchingContact.notes) {
        contactInfo += `🧠 **AI Insights:** ${matchingContact.notes}\n\n`;
      }

      // Wellness tags
      if (matchingContact.tags) {
        try {
          let tags = [];
          if (typeof matchingContact.tags === 'string') {
            tags = JSON.parse(matchingContact.tags);
          } else if (Array.isArray(matchingContact.tags)) {
            tags = matchingContact.tags;
          }
          
          if (tags.length > 0) {
            contactInfo += `🏷️ **Wellness Tags:** ${tags.join(', ')}\n\n`;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Confidence score
      if (matchingContact.confidenceScore) {
        const confidence = Math.round(parseFloat(matchingContact.confidenceScore) * 100);
        contactInfo += `📊 **AI Confidence:** ${confidence}%\n\n`;
      }

      // Timestamps
      const createdDate = new Date(matchingContact.createdAt).toLocaleDateString();
      const updatedDate = new Date(matchingContact.updatedAt).toLocaleDateString();
      contactInfo += `📅 **Added:** ${createdDate}\n`;
      contactInfo += `🔄 **Last Updated:** ${updatedDate}`;

      return {
        success: true,
        data: {
          message: contactInfo,
          contact: matchingContact
        }
      };
    } catch (error) {
      return {
        success: false,
        error: "Failed to get contact details"
      };
    }
  }

  /**
   * Main query processor that determines what the user is asking for
   */
  static async processQuery(userId: string, query: string): Promise<DatabaseQueryResult> {
    const normalizedQuery = query.toLowerCase();

    // Personal information queries - check these first!
    if (normalizedQuery.includes('tell me about') || normalizedQuery.includes('about ') || 
        normalizedQuery.includes('who is') || normalizedQuery.includes('information about') ||
        normalizedQuery.includes('details about') || normalizedQuery.includes('profile')) {
      
      // Extract the person's name
      const nameMatch = normalizedQuery.match(/(?:tell me about|about|who is|information about|details about|profile for|profile of)\s+(.+)/);
      if (nameMatch?.[1]) {
        return this.getContactDetails(userId, nameMatch[1].trim());
      }
    }

    // Check for direct name mentions (First Last pattern)
    const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/;
    const nameMatch = query.match(namePattern);
    if (nameMatch) {
      return this.getContactDetails(userId, nameMatch[0]);
    }

    // Check for specific contact names in our database
    if (/\b(fischer|fisher|wilson|rossi|torres|svensson|nascimento|oconnor|chen|mendez|singh|costa|ruiz|kaur|novak|herrera|patel|rivas|blizzard)\b/i.test(normalizedQuery)) {
      const contactNameMatch = normalizedQuery.match(/\b(fischer|fisher|wilson|rossi|torres|svensson|nascimento|oconnor|chen|mendez|singh|costa|ruiz|kaur|novak|herrera|patel|rivas|blizzard)\b/i);
      if (contactNameMatch) {
        return this.getContactDetails(userId, contactNameMatch[0]);
      }
    }

    // Names/listing queries
    if (normalizedQuery.includes('names') || normalizedQuery.includes('their names') || 
        normalizedQuery.includes('list contacts') || normalizedQuery.includes('show me contacts') ||
        normalizedQuery.includes('all contacts') || normalizedQuery.includes('contact names') ||
        (normalizedQuery.includes('their') && normalizedQuery.length < 15)) {
      return this.getAllContactNames(userId);
    }

    // Specific filter queries (more specific patterns first)
    if (normalizedQuery.includes('begin') || normalizedQuery.includes('start') || 
        normalizedQuery.includes('with email') || normalizedQuery.includes('with phone') ||
        normalizedQuery.includes('without') || normalizedQuery.includes('containing') ||
        normalizedQuery.includes('have email') || normalizedQuery.includes('have phone')) {
      return this.filterContacts(userId, query);
    }

    // Count queries
    if (normalizedQuery.includes('how many contacts') || normalizedQuery.includes('contacts count') || normalizedQuery.includes('number of contacts')) {
      return this.getContactsCount(userId);
    }

    // Notes queries
    if (normalizedQuery.includes('how many notes') || normalizedQuery.includes('notes count')) {
      return this.getNotesInfo(userId);
    }

    // Summary queries
    if (normalizedQuery.includes('contacts summary') || normalizedQuery.includes('overview') || normalizedQuery.includes('all contacts')) {
      return this.getContactsSummary(userId);
    }

    // Search queries
    if (normalizedQuery.includes('find') || normalizedQuery.includes('search') || normalizedQuery.includes('look for')) {
      // Extract search term (simple approach)
      const searchMatch = normalizedQuery.match(/(?:find|search|look for)\s+(?:contact\s+)?(.+)/);
      if (searchMatch?.[1]) {
        return this.searchContacts(userId, searchMatch[1].trim());
      }
    }

    // Default to contacts count for general contact queries
    if (normalizedQuery.includes('contact')) {
      return this.getContactsCount(userId);
    }

    return {
      success: false,
      error: "I can help you with:\n- How many contacts you have\n- Contacts that begin with a specific letter\n- Contacts with/without email or phone\n- Contact summaries and searches\n- Notes information\n\nTry asking: 'How many contacts begin with P?' or 'Show me contacts with email addresses'."
    };
  }
}