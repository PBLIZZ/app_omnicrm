import { Suspense } from "react";
import { NoteDetailView } from "./_components/NoteDetailView";

interface NoteDetailPageProps {
  params: Promise<{
    contactId: string;
    noteId: string;
  }>;
}

export default async function NoteDetailPage({
  params,
}: NoteDetailPageProps): Promise<JSX.Element> {
  const { contactId, noteId } = await params;

  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading note...</div>
          </div>
        </div>
      }
    >
      <NoteDetailView contactId={contactId} noteId={noteId} />
    </Suspense>
  );
}
