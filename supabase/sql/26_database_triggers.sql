// ===== 5. DATABASE TRIGGERS (SQL) =====
-- Auto-sync embeddings when data changes

-- Function to sync embeddings on client changes
CREATE OR REPLACE FUNCTION sync_client_embedding()
RETURNS TRIGGER AS $$
BEGIN
  -- Call your embedding sync API or handle via application
  PERFORM pg_notify('embedding_sync', json_build_object(
    'action', TG_OP,
    'content_type', 'client',
    'content_id', COALESCE(NEW.id, OLD.id),
    'title', COALESCE(NEW.name, OLD.name),
    'content', COALESCE(NEW.email || ' ' || COALESCE(NEW.phone, '') || ' ' || COALESCE(NEW.notes, ''), '')
  )::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic embedding sync
CREATE TRIGGER client_embedding_sync
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION sync_client_embedding();

-- Similar triggers for other content types...

-- ===== 6. USAGE EXAMPLE (app/page.tsx) =====
import { RAGProvider } from '@/contexts/RAGContext'
import { ChatAssistant } from '@/components/ChatAssistant'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Other dashboard content */}
      <div className="lg:col-span-2">
        {/* Main dashboard widgets */}
      </div>

      {/* Chat Assistant Sidebar */}
      <div className="lg:col-span-1">
        <RAGProvider>
          <ChatAssistant className="h-[600px]" />
        </RAGProvider>
      </div>
    </div>
  )
}
