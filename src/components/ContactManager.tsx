"use client";

import { ContactSelector, type LinkedContact } from "@/components/ContactSelector";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useContacts } from "@/hooks/use-contacts";
import { useMomentum } from "@/hooks/use-momentum";

interface ContactManagerProps {
  /** Current linked contacts on the task */
  linkedContacts: LinkedContact[];
  /** Task ID to update */
  taskId: string;
  /** Maximum number of contacts to show before "+X more" */
  maxVisible?: number;
  /** Callback when contacts modal is opened (optional) */
  onOpenModal?: () => void;
  /** Show the contact selector modal */
  showModal: boolean;
  /** Callback to control modal visibility */
  onModalChange: (open: boolean) => void;
}

/**
 * Get initials from contact name for avatar fallback
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * ContactManager - Reusable component for managing linked contacts on tasks
 *
 * Used for weekend retreat planning and other tasks where you need to track
 * contact-specific actions (sending updates, getting consent forms, etc.)
 *
 * @example
 * ```tsx
 * const [showContactModal, setShowContactModal] = useState(false);
 *
 * <ContactManager
 *   linkedContacts={task.details?.linkedContacts || []}
 *   taskId={task.id}
 *   showModal={showContactModal}
 *   onModalChange={setShowContactModal}
 * />
 * ```
 */
export function ContactManager({
  linkedContacts,
  taskId,
  maxVisible = 3,
  onOpenModal,
  showModal,
  onModalChange,
}: ContactManagerProps) {
  const { updateTask } = useMomentum();
  const { data: contactsResponse, isLoading } = useContacts("", 1, 100);

  // Transform contact data to LinkedContact format
  const availableContacts: LinkedContact[] = (contactsResponse?.items || []).map((contact) => ({
    id: contact.id,
    name: contact.displayName,
    email: contact.primaryEmail || undefined,
    photoUrl: contact.photoUrl || undefined,
  }));

  // Visible contacts (max 3 by default)
  const visibleContacts = linkedContacts.slice(0, maxVisible);
  const hiddenContactsCount = Math.max(0, linkedContacts.length - maxVisible);

  // Apply contact changes to task
  const applyContacts = async (newContacts: LinkedContact[]): Promise<void> => {
    // Update task with new linked contacts in details field
    // Only store id and name to keep JSONB lean
    await updateTask(taskId, {
      details: {
        linkedContacts: newContacts.map(c => ({ id: c.id, name: c.name }))
      }
    });
  };

  const handleOpenModal = (): void => {
    onOpenModal?.();
    onModalChange(true);
  };

  return (
    <TooltipProvider>
      {/* Contact Display - Overlapping Avatars */}
      <div className="flex items-center">
        {linkedContacts.length === 0 ? (
          // Show "Add contacts" button when no contacts linked
          <button
            onClick={handleOpenModal}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
            disabled={isLoading}
          >
            <span>+ Add contacts</span>
          </button>
        ) : (
          // Show existing linked contacts as overlapping avatars
          <div className="flex items-center group">
            {/* Avatar Stack - overlapping by default, expand on hover */}
            <div className="flex items-center -space-x-2 group-hover:space-x-1 transition-all duration-200">
              {visibleContacts.map((contact, index) => {
                // Enrich with full contact data if available
                const fullContact = availableContacts.find(c => c.id === contact.id);

                return (
                  <Tooltip key={contact.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleOpenModal}
                        className="relative inline-block cursor-pointer hover:scale-110 transition-transform duration-200 hover:z-10"
                        style={{ zIndex: visibleContacts.length - index }}
                      >
                        <Avatar className="w-8 h-8 border-2 border-white shadow-sm">
                          {fullContact?.photoUrl ? (
                            <AvatarImage src={fullContact.photoUrl} alt={contact.name} />
                          ) : null}
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                            {getInitials(contact.name)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-sm font-medium">{contact.name}</p>
                      {fullContact?.email && (
                        <p className="text-xs text-gray-400">{fullContact.email}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* "+X more" indicator */}
            {hiddenContactsCount > 0 && (
              <button
                onClick={handleOpenModal}
                className="ml-2 flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 border-2 border-white shadow-sm transition-colors"
              >
                <span className="text-xs font-medium text-gray-600">
                  +{hiddenContactsCount}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact Selector Modal */}
      <ContactSelector
        open={showModal}
        onOpenChange={onModalChange}
        selectedContacts={linkedContacts}
        availableContacts={availableContacts}
        onContactsChange={async (newContacts) => {
          console.log(`🔗 Task ${taskId} contacts changed:`, newContacts);
          await applyContacts(newContacts);
        }}
      />
    </TooltipProvider>
  );
}
