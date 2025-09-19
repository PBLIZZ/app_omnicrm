import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MessagesLoading(): JSX.Element {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] p-6">
      {/* Header Loading */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* Conversations List Loading */}
        <div className="w-80 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-8 w-8" />
              </div>

              <Skeleton className="h-9 w-full" />
            </CardHeader>

            <CardContent className="flex-1 p-0 overflow-hidden">
              <div className="space-y-1 p-3">
                {[...Array(6).keys()].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <div className="relative">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <div className="flex items-center gap-1">
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                      </div>
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area Loading */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 flex flex-col">
            {/* Chat Header Loading */}
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>

            <div className="border-t" />

            {/* Messages Loading */}
            <CardContent className="flex-1 p-4 space-y-4">
              {[...Array(4).keys()].map((i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                >
                  {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full mt-1" />}

                  <div className="space-y-1">
                    <Skeleton className={`h-16 ${i % 2 === 0 ? "w-64" : "w-48"} rounded-lg`} />
                    <Skeleton className="h-3 w-12" />
                  </div>
                </div>
              ))}
            </CardContent>

            <div className="border-t" />

            {/* Message Input Loading */}
            <CardContent className="p-4">
              <div className="flex items-end gap-2">
                <Skeleton className="flex-1 h-10" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
