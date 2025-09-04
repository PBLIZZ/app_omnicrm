import { GmailConnectionCard } from "./_components/GmailConnectionCard";

export default function Page(): JSX.Element {
  return <GmailConnectionCard 
    isSyncing={false}
    isEmbedding={false}
    isProcessingContacts={false}
    showSyncPreview={false}
    setShowSyncPreview={() => {}}
    onApproveSync={() => {}}
    onGenerateEmbeddings={() => {}}
    onProcessContacts={() => {}}
  />;
}
