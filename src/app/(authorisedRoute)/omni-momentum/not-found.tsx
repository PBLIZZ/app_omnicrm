import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ArrowLeft, Home } from "lucide-react";

export default function NotFound(): JSX.Element {
  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100">
              <Zap className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            This path doesn't exist in your momentum journey
          </CardTitle>
          <CardDescription className="text-base">
            The page you're looking for isn't part of your Omni-Momentum experience. 
            Let's guide you back to your wellness flow.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-sm mb-2 text-purple-800">🧭 Find Your Way</h3>
            <p className="text-sm text-purple-700">
              Just like in wellness practice, sometimes we take a wrong turn. 
              The key is to gently redirect ourselves back to our intended path without judgment.
            </p>
          </div>

          <div className="grid gap-3">
            <h4 className="font-medium text-sm">Popular destinations in your momentum journey:</h4>
            <div className="space-y-2">
              <Link href="/omni-momentum" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                <Zap className="h-4 w-4" />
                Omni-Momentum Dashboard
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                <Home className="h-4 w-4" />
                Main Dashboard
              </Link>
              <Link href="/contacts" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                <span className="h-4 w-4 text-center">👥</span>
                Client Contacts
              </Link>
              <Link href="/calendar" className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                <span className="h-4 w-4 text-center">📅</span>
                Calendar & Sessions
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild>
              <Link href="/omni-momentum" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Back to Omni-Momentum
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Return to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Serene background elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-purple-100/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-blue-100/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-100/5 to-blue-100/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}