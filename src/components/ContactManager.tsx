"use client";

import { ContactSelector, type LinkedContact } from "@/components/ContactSelector";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
 * Derives display initials from a contact name for avatar fallbacks.
 *
 * Trims whitespace and splits the name into words; for a single-word name returns its first letter,
 * for multi-word names returns the first letter of the first and last words, and returns `"?"` when
 * no usable character can be derived.
 *
 * @returns A one- or two-character uppercase string of initials, or `"?"` if no initials can be derived.
 */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";

  const firstPart = parts[0];
  if (!firstPart) return "?";

  if (parts.length === 1) {
    const firstChar = firstPart[0];
    return firstChar ? firstChar.toUpperCase() : "?";
  }

  const lastPart = parts[parts.length - 1];
  const firstChar = firstPart[0];
  const lastChar = lastPart ? lastPart[0] : undefined;

  if (!firstChar) return "?";
  if (!lastChar) return firstChar.toUpperCase();

  return (firstChar + lastChar).toUpperCase();
}

/**
 * Render and manage linked contacts for a task, showing avatars and a modal to add or edit contacts.
 *
 * Displays overlapping contact avatars (photo or initials) up to `maxVisible`, shows a "+N" indicator for hidden contacts, and a "+ Add contacts" action when none are linked. Opening the selector invokes `onOpenModal` (if provided) and sets `onModalChange(true)`. When selections change, the task is updated with only each contact's `id` and `name`.
 *
 * @example
 * <ContactManager
 *   linkedContacts={task.details?.linkedContacts || []}
 *   taskId={task.id}
 *   showModal={showContactModal}
 *   onModalChange={setShowContactModal}
 * />
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
  const availableContacts: LinkedContact[] = (contactsResponse?.items || []).map((contact) => {
    const linkedContact: LinkedContact = {
      id: contact.id,
      name: contact.displayName,
    };

    // Only add optional properties if they exist (exactOptionalPropertyTypes compliance)
    if (contact.primaryEmail) {
      linkedContact.email = contact.primaryEmail;
    }
    if (contact.photoUrl) {
      linkedContact.photoUrl = contact.photoUrl;
    }

    return linkedContact;
  });

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