import { MessageSquare, Home, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MessagesNotFound(): JSX.Element {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Message Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The message or conversation you&apos;re looking for doesn&apos;t exist, may have been
            deleted, or you don&apos;t have permission to access it.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="default" className="min-w-[140px]">
          <Link href="/messages">
            <MessageSquare className="h-4 w-4 mr-2" />
            View Messages
          </Link>
        </Button>

        <Button asChild variant="outline" className="min-w-[140px]">
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>

        <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
          <Link href="/messages">
            <Plus className="h-4 w-4 mr-2" />
            Start New Conversation
          </Link>
        </Button>
      </div>
    </div>
  );
}
