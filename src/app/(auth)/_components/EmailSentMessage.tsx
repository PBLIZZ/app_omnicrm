import { Button } from "@/components/ui";

interface EmailSentMessageProps {
  message: string;
  onBackToSignIn: () => void;
}

export function EmailSentMessage({ message, onBackToSignIn }: EmailSentMessageProps): JSX.Element {
  return (
    <div className="text-center space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <p className="text-green-800 font-medium">Email sent!</p>
        <p className="text-green-600 text-sm mt-1">{message}</p>
      </div>
      <Button variant="outline" onClick={onBackToSignIn} className="w-full">
        Back to Sign In
      </Button>
    </div>
  );
}
