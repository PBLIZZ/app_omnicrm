/**
 * Client-side Calendar Business Intelligence Service
 *
 * Provides business intelligence functionality for the OmniRhythm calendar system.
 * This is a lightweight client-side version that works with the useOmniRhythmData hook.
 */

import { Client } from "./types";

export class CalendarBusinessIntelligence {
  private clients: Client[] = [];

  /**
   * Update the client data used for business intelligence calculations
   */
  public updateClientData(clients: Client[]): void {
    this.clients = clients;
  }

  /**
   * Get all clients
   */
  public getClients(): Client[] {
    return this.clients;
  }

  /**
   * Get high-value clients (those with high spending or satisfaction)
   */
  public getHighValueClients(): Client[] {
    return this.clients.filter((client) => client.totalSpent > 1000 || client.satisfaction >= 4);
  }

  /**
   * Get clients that need attention (low satisfaction or inactive)
   */
  public getClientsNeedingAttention(): Client[] {
    return this.clients.filter((client) => client.satisfaction < 3 || client.status === "inactive");
  }

  /**
   * Calculate total revenue from all clients
   */
  public getTotalRevenue(): number {
    return this.clients.reduce((total, client) => total + client.totalSpent, 0);
  }

  /**
   * Get average client satisfaction
   */
  public getAverageSatisfaction(): number {
    if (this.clients.length === 0) return 0;

    const totalSatisfaction = this.clients.reduce(
      (total, client) => total + client.satisfaction,
      0,
    );

    return Math.round((totalSatisfaction / this.clients.length) * 10) / 10;
  }

  /**
   * Get client retention rate (active clients vs total)
   */
  public getRetentionRate(): number {
    if (this.clients.length === 0) return 0;

    const activeClients = this.clients.filter((client) => client.status === "active").length;
    return Math.round((activeClients / this.clients.length) * 100);
  }
}
