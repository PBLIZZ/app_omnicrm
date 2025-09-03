import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail,
  Link,
  BarChart3,
  Clock,
} from "lucide-react";

interface GmailConnectionPromptProps {
  onConnect: () => void;
  isConnecting: boolean;
}

export function GmailConnectionPrompt({ onConnect, isConnecting }: GmailConnectionPromptProps) {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle>Connect Your Gmail</CardTitle>
        <CardDescription>
          Sync your email communications to automatically extract client interactions and build
          comprehensive contact timelines.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Mail className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium">Email History</h3>
              <p className="text-muted-foreground text-center">
                Import past conversations and client communications
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium">Contact Intelligence</h3>
              <p className="text-muted-foreground text-center">
                Extract client information and engagement patterns
              </p>
            </div>
            <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium">Timeline Building</h3>
              <p className="text-muted-foreground text-center">
                Automatically create comprehensive client histories
              </p>
            </div>
          </div>
          <Button onClick={onConnect} disabled={isConnecting} size="lg">
            <Link className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect Gmail"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
