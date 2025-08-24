// Memory Manager - Simple implementation for monitoring memory usage
// Provides basic memory usage monitoring for database connection optimization

export interface MemoryUsage {
  usedMB: number;
  totalMB: number;
  freeMB: number;
  usagePercent: number;
}

/**
 * Simple memory manager for monitoring system memory usage
 */
class MemoryManager {
  private memoryCache: MemoryUsage | null = null;
  private lastUpdate = 0;
  private readonly CACHE_DURATION_MS = 1000; // Cache for 1 second

  /**
   * Get current memory usage statistics
   */
  getMemoryUsage(): MemoryUsage {
    const now = Date.now();
    
    // Return cached value if still fresh
    if (this.memoryCache && (now - this.lastUpdate) < this.CACHE_DURATION_MS) {
      return this.memoryCache;
    }

    // Get Node.js process memory usage
    const memUsage = process.memoryUsage();
    
    // Convert bytes to MB
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const freeMB = totalMB - usedMB;
    const usagePercent = Math.round((usedMB / totalMB) * 100);

    this.memoryCache = {
      usedMB,
      totalMB,
      freeMB,
      usagePercent,
    };
    
    this.lastUpdate = now;
    return this.memoryCache;
  }

  /**
   * Check if memory usage is above a certain threshold
   */
  isMemoryPressureHigh(thresholdMB: number): boolean {
    const usage = this.getMemoryUsage();
    return usage.usedMB > thresholdMB;
  }

  /**
   * Get formatted memory usage string for logging
   */
  getFormattedUsage(): string {
    const usage = this.getMemoryUsage();
    return `${usage.usedMB}MB/${usage.totalMB}MB (${usage.usagePercent}%)`;
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();