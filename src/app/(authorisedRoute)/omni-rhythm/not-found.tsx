import { Calendar, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CalendarNotFound(): JSX.Element {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-muted rounded-full">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Calendar Not Found</h2>
          <p className="text-muted-foreground max-w-md">
            The calendar page or resource you&apos;re looking for doesn&apos;t exist or may have
            been moved.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild variant="default" className="min-w-[140px]">
          <Link href="/calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Go to Calendar
          </Link>
        </Button>

        <Button asChild variant="outline" className="min-w-[140px]">
          <Link href="/dashboard">
            <Home className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.history.back()}
        className="text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  );
}
