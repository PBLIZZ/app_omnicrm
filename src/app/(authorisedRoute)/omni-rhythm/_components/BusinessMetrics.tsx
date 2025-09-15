import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, TrendingDown, Users, DollarSign } from "lucide-react";
import { BusinessMetricsProps } from "./types";

export function BusinessMetrics({
  totalSessions,
  totalRevenue,
  newClients,
  busiestDay,
  utilizationRate,
  clientRetention,
}: BusinessMetricsProps): JSX.Element {
  const isHighPerforming = totalSessions > 20;
  const hasGoodUtilization = utilizationRate > 60;
  const hasStrongRetention = clientRetention > 80;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <div className="text-2xl font-bold">{totalSessions}</div>
            {isHighPerforming && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                High Performance
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Revenue</span>
            </div>
            <div className="text-2xl font-bold">${totalRevenue}</div>
            <Badge variant="secondary" className="text-xs">
              {totalRevenue > 1000 ? "Strong" : "Growing"}
            </Badge>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">New Clients</span>
            <Badge variant="secondary">{newClients}</Badge>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Busiest Day</span>
            <Badge variant="outline">{busiestDay}</Badge>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Utilization</span>
            <div className="flex items-center gap-1">
              {hasGoodUtilization ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-orange-600" />
              )}
              <span>{utilizationRate}%</span>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Retention</span>
            <div className="flex items-center gap-1">
              {hasStrongRetention ? (
                <CheckCircle className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingUp className="h-3 w-3 text-blue-600" />
              )}
              <span>{clientRetention}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
