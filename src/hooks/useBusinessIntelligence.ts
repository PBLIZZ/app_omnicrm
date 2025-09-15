import { useMemo } from "react";
import {
  RhythmIntelligenceService,
  type CalendarEvent,
  type WeeklyStats,
} from "@/server/services/rhythm-intelligence.service";

export function useBusinessIntelligence(appointments: CalendarEvent[] = []): {
  enhancedAppointments: CalendarEvent[];
  weeklyStats: WeeklyStats;
  todaysEvents: CalendarEvent[];
  upcomingEvents: CalendarEvent[];
  preparationEvents: CalendarEvent[];
  businessInsights: {
    totalRevenue: number;
    totalSessions: number;
    busiestDay: string;
    utilizationRate: number;
    newClients: number;
    avgSessionLength: number;
    clientRetention: number;
  };
  performanceIndicators: {
    isHighPerforming: boolean;
    needsMoreClients: boolean;
    goodUtilization: boolean;
    strongRetention: boolean;
    revenueGrowth: boolean;
  };
  recommendations: string[];
  getTodaysPriorityEvents: () => CalendarEvent[];
  getUpcomingPriorityEvents: (limit?: number) => CalendarEvent[];
  getUpcomingPreparationEvents: () => CalendarEvent[];
  calculateWeeklyStats: () => WeeklyStats;
} {
  // Enhanced appointments with business intelligence
  const enhancedAppointments = useMemo(() => {
    return RhythmIntelligenceService.enhanceEvents(appointments);
  }, [appointments]);

  // Weekly statistics
  const weeklyStats = useMemo(() => {
    return RhythmIntelligenceService.calculateWeeklyStats(enhancedAppointments);
  }, [enhancedAppointments]);

  // Today's priority events
  const todaysEvents = useMemo(() => {
    return RhythmIntelligenceService.getTodaysPriorityEvents(appointments);
  }, [appointments]);

  // Upcoming events (next 5 events)
  const upcomingEvents = useMemo(() => {
    try {
      return RhythmIntelligenceService.getUpcomingPriorityEvents(appointments, 5);
    } catch {
      return [];
    }
  }, [appointments]);

  // Upcoming events needing preparation
  const preparationEvents = useMemo(() => {
    return RhythmIntelligenceService.getUpcomingPreparationEvents(appointments);
  }, [appointments]);

  // Business insights
  const businessInsights = useMemo(() => {
    const stats = weeklyStats;

    return {
      totalRevenue: stats.totalRevenue,
      totalSessions: stats.totalAppointments,
      busiestDay: stats.busiestDay,
      utilizationRate: stats.utilizationRate,
      newClients: stats.newClients,
      avgSessionLength: stats.avgSessionLength,
      clientRetention: stats.clientRetention,
    };
  }, [weeklyStats]);

  // Performance indicators
  const performanceIndicators = useMemo(() => {
    const insights = businessInsights;

    return {
      isHighPerforming: insights.totalSessions > 20,
      needsMoreClients: insights.totalSessions < 10,
      goodUtilization: insights.utilizationRate > 60,
      strongRetention: insights.clientRetention > 80,
      revenueGrowth: insights.totalRevenue > 1000,
    };
  }, [businessInsights]);

  // Recommendations based on data
  const recommendations = useMemo(() => {
    const insights = businessInsights;
    const performance = performanceIndicators;

    const recs: string[] = [];

    if (performance.needsMoreClients) {
      recs.push("Consider marketing campaigns to attract new clients");
    }

    if (!performance.goodUtilization) {
      recs.push("Optimize scheduling to increase utilization rate");
    }

    if (performance.strongRetention) {
      recs.push("Excellent client retention - consider referral program");
    }

    if (insights.busiestDay) {
      recs.push(`Your busiest day is ${insights.busiestDay} - consider extending hours`);
    }

    if (insights.totalRevenue > 2000) {
      recs.push("Strong revenue performance - consider premium service pricing");
    }

    return recs;
  }, [businessInsights, performanceIndicators]);

  return {
    // Enhanced data
    enhancedAppointments,
    weeklyStats,
    todaysEvents,
    upcomingEvents,
    preparationEvents,

    // Business insights
    businessInsights,
    performanceIndicators,
    recommendations,

    // Utility functions
    getTodaysPriorityEvents: () => RhythmIntelligenceService.getTodaysPriorityEvents(appointments),
    getUpcomingPriorityEvents: (limit?: number) =>
      RhythmIntelligenceService.getUpcomingPriorityEvents(appointments, limit),
    getUpcomingPreparationEvents: () =>
      RhythmIntelligenceService.getUpcomingPreparationEvents(appointments),
    calculateWeeklyStats: () =>
      RhythmIntelligenceService.calculateWeeklyStats(
        RhythmIntelligenceService.enhanceEvents(appointments),
      ),
  };
}
