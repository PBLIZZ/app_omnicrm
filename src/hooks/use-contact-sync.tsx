"use client";

/**
 * Global state management for contact sync with WebSocket integration
 * Coordinates real-time contact creation across all components
 */

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { toast } from "sonner";

interface Contact {
  id: string;
  displayName: string;
  primaryEmail?: string | undefined;
  source: string;
  timestamp: string;
}

interface SyncProgress {
  current: number;
  total: number;
  message: string;
}

interface SSEMessageBase {
  type: string;
  timestamp?: string;
}

interface SSEConnectionMessage extends SSEMessageBase {
  type: "connection" | "heartbeat";
  message?: string;
  userId?: string;
}

interface SSEContactCreatedMessage extends SSEMessageBase {
  type: "contact_created";
  contactId?: string | undefined;
  contact?:
    | {
        id: string;
        displayName: string;
        primaryEmail?: string | undefined;
        source: string;
      }
    | undefined;
}

interface SSESyncProgressMessage extends SSEMessageBase {
  type: "sync_progress";
  progress?: SyncProgress;
}

interface SSESyncCompleteMessage extends SSEMessageBase {
  type: "sync_complete";
  progress?: SyncProgress;
}

type SSEMessage =
  | SSEConnectionMessage
  | SSEContactCreatedMessage
  | SSESyncProgressMessage
  | SSESyncCompleteMessage;

interface ContactSyncState {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Sync state
  isSyncing: boolean;
  isComplete: boolean;
  progress: SyncProgress;

  // Contact data
  newContacts: Contact[];
  totalContactsCreated: number;

  // Actions
  startSync: (source: "gmail") => Promise<void>;
  stopSync: () => void;
  clearContacts: () => void;
  retryConnection: () => void;
}

// Create context
const ContactSyncContext = createContext<ContactSyncState | undefined>(undefined);

// Hook to use the contact sync state
export function useContactSync(): ContactSyncState {
  const context = useContext(ContactSyncContext);
  if (!context) {
    throw new Error("useContactSync must be used within ContactSyncProvider");
  }
  return context;
}

// Provider component
export function ContactSyncProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState<SyncProgress>({ current: 0, total: 0, message: "" });
  const [newContacts, setNewContacts] = useState<Contact[]>([]);
  const [totalContactsCreated, setTotalContactsCreated] = useState(0);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Initialize SSE connection
  const initializeConnection = useCallback(() => {
    if (eventSource) {
      eventSource.close();
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const es = new EventSource("/api/contacts/stream");

      es.onopen = (): void => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);
      };

      es.onmessage = (event) => {
        try {
          const rawData: unknown = JSON.parse(event.data);

          // Type guard to ensure data has the expected shape
          const isSSEMessage = (data: unknown): data is SSEMessage => {
            return (
              typeof data === "object" &&
              data !== null &&
              "type" in data &&
              typeof (data as { type: unknown }).type === "string"
            );
          };

          if (!isSSEMessage(rawData)) {
            console.warn("Received invalid SSE message format:", rawData);
            return;
          }

          const data = rawData;

          switch (data.type) {
            case "connection":
            case "heartbeat":
              // Initial connection established or heartbeat
              break;

            case "contact_created":
              if (data.contact) {
                const contact: Contact = {
                  id: data.contactId ?? data.contact.id,
                  displayName: data.contact.displayName,
                  primaryEmail: data.contact.primaryEmail,
                  source: data.contact.source,
                  timestamp: data.timestamp ?? new Date().toISOString(),
                };

                setNewContacts((prev) => [contact, ...prev.slice(0, 49)]); // Keep last 50
                setTotalContactsCreated((prev) => prev + 1);

                toast.success(`Created: ${contact.displayName}`, {
                  duration: 2000,
                });
              }
              break;

            case "sync_progress":
              if (data.progress) {
                setProgress(data.progress);
                setIsSyncing(true);
              }
              break;

            case "sync_complete":
              setIsSyncing(false);
              setIsComplete(true);

              if (data.progress) {
                setProgress(data.progress);
                toast.success(data.progress.message, {
                  duration: 5000,
                });
              }

              // Reset complete state after some time
              setTimeout(() => {
                setIsComplete(false);
              }, 10000);
              break;

            default:
              console.log("Unknown SSE event:", (data as SSEMessageBase).type);
          }
        } catch (error) {
          console.error("Error parsing SSE message:", error);
        }
      };

      es.onerror = (error) => {
        console.error("SSE connection error:", error);
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionError("Connection lost to live updates");

        // Auto-retry after 3 seconds
        setTimeout(() => {
          if (!isConnected) {
            initializeConnection();
          }
        }, 3000);
      };

      setEventSource(es);
    } catch (error) {
      console.error("Failed to initialize SSE connection:", error);
      setIsConnecting(false);
      setConnectionError("Failed to connect to live updates");

      // Retry after 5 seconds if initialization fails
      setTimeout(() => {
        initializeConnection();
      }, 5000);
    }
  }, [eventSource, isConnected]);

  // Start sync process
  const startSync = useCallback(async (source: "gmail") => {
    interface SyncResponse {
      message: string;
      success: boolean;
    }

    // Type guard for sync response
    const isSyncResponse = (data: unknown): data is SyncResponse => {
      return (
        typeof data === "object" &&
        data !== null &&
        "message" in data &&
        typeof (data as { message: unknown }).message === "string"
      );
    };

    try {
      setIsSyncing(true);
      setIsComplete(false);
      setProgress({ current: 0, total: 0, message: "Starting sync..." });

      const response = await fetch("/api/contacts/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source, mode: "full" }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const rawResult: unknown = await response.json();

      if (!isSyncResponse(rawResult)) {
        throw new Error("Invalid sync response format");
      }

      const result = rawResult;
      toast.success("Contact sync started!", {
        description: result.message,
        duration: 3000,
      });
    } catch (error) {
      console.error("Sync start error:", error);
      setIsSyncing(false);

      const message = error instanceof Error ? error.message : "Failed to start sync";
      setConnectionError(message);
      toast.error("Sync failed to start", {
        description: message,
      });
    }
  }, []);

  // Stop sync process
  const stopSync = useCallback(() => {
    setIsSyncing(false);
    setIsComplete(false);
    setProgress({ current: 0, total: 0, message: "" });
  }, []);

  // Clear contact list
  const clearContacts = useCallback(() => {
    setNewContacts([]);
    setTotalContactsCreated(0);
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    initializeConnection();
  }, [initializeConnection]);

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: ContactSyncState = {
    isConnected,
    isConnecting,
    connectionError,
    isSyncing,
    isComplete,
    progress,
    newContacts,
    totalContactsCreated,
    startSync,
    stopSync,
    clearContacts,
    retryConnection,
  };

  return <ContactSyncContext.Provider value={value}>{children}</ContactSyncContext.Provider>;
}

// Standalone hook for components that don't need the full context
export function useContactSyncConnection(): {
  isConnected: boolean;
  eventSource: EventSource | null;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/contacts/stream");

    es.onopen = () => setIsConnected(true);
    es.onerror = () => setIsConnected(false);
    // Note: EventSource doesn't have onclose, it uses onerror for connection issues

    setEventSource(es);

    return () => {
      es.close();
    };
  }, []);

  return { isConnected, eventSource };
}
