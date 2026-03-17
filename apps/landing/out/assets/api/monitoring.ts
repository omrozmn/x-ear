// API Migration Monitoring System
// Tracks performance, errors, and migration health

export interface MetricData {
  timestamp: number;
  operation: string;
  endpoint: string;
  duration: number;
  success: boolean;
  error?: string;
  clientType: 'legacy' | 'generated';
  shadowMismatch?: boolean;
}

export interface HealthMetrics {
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
  errorRate: number;
  shadowMismatchRate: number;
  lastError?: string;
  lastErrorTime?: number;
}

class ApiMonitor {
  private metrics: MetricData[] = [];
  private readonly maxMetrics = 1000; // Keep last 1000 metrics
  private errorCount = 0;
  private consecutiveErrors = 0;
  
  // Record a metric
  recordMetric(data: Omit<MetricData, 'timestamp'>): void {
    const metric: MetricData = {
      ...data,
      timestamp: Date.now()
    };
    
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
    
    // Track error patterns
    if (!data.success) {
      this.errorCount++;
      this.consecutiveErrors++;
    } else {
      this.consecutiveErrors = 0;
    }
    
    // Check for rollback conditions
    this.checkRollbackConditions();
  }
  
  // Get health metrics for the last N minutes
  getHealthMetrics(lastMinutes: number = 5): HealthMetrics {
    const cutoff = Date.now() - (lastMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 1,
        averageResponseTime: 0,
        errorRate: 0,
        shadowMismatchRate: 0
      };
    }
    
    const successfulRequests = recentMetrics.filter(m => m.success);
    const shadowMismatches = recentMetrics.filter(m => m.shadowMismatch);
    const lastError = recentMetrics.filter(m => !m.success).pop();
    
    return {
      totalRequests: recentMetrics.length,
      successRate: successfulRequests.length / recentMetrics.length,
      averageResponseTime: recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length,
      errorRate: (recentMetrics.length - successfulRequests.length) / recentMetrics.length,
      shadowMismatchRate: shadowMismatches.length / recentMetrics.length,
      lastError: lastError?.error,
      lastErrorTime: lastError?.timestamp
    };
  }
  
  // Check if rollback conditions are met
  private checkRollbackConditions(): void {
    const { getMigrationFlags, emergencyRollback } = require('./migration-flags');
    const flags = getMigrationFlags();
    
    // Check consecutive errors
    if (this.consecutiveErrors >= flags.rollbackThreshold) {
      console.error(`🚨 EMERGENCY ROLLBACK: ${this.consecutiveErrors} consecutive errors`);
      emergencyRollback();
      return;
    }
    
    // Check error rate over last 5 minutes
    const health = this.getHealthMetrics(5);
    if (health.totalRequests >= 10 && health.errorRate > flags.maxErrorRate) {
      console.error(`🚨 EMERGENCY ROLLBACK: Error rate ${(health.errorRate * 100).toFixed(1)}% exceeds threshold ${(flags.maxErrorRate * 100).toFixed(1)}%`);
      emergencyRollback();
      return;
    }
  }
  
  // Get performance comparison between legacy and generated clients
  getPerformanceComparison(lastMinutes: number = 10): {
    legacy: HealthMetrics;
    generated: HealthMetrics;
  } {
    const cutoff = Date.now() - (lastMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    const legacyMetrics = recentMetrics.filter(m => m.clientType === 'legacy');
    const generatedMetrics = recentMetrics.filter(m => m.clientType === 'generated');
    
    return {
      legacy: this.calculateHealthMetrics(legacyMetrics),
      generated: this.calculateHealthMetrics(generatedMetrics)
    };
  }
  
  private calculateHealthMetrics(metrics: MetricData[]): HealthMetrics {
    if (metrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 1,
        averageResponseTime: 0,
        errorRate: 0,
        shadowMismatchRate: 0
      };
    }
    
    const successfulRequests = metrics.filter(m => m.success);
    const shadowMismatches = metrics.filter(m => m.shadowMismatch);
    const lastError = metrics.filter(m => !m.success).pop();
    
    return {
      totalRequests: metrics.length,
      successRate: successfulRequests.length / metrics.length,
      averageResponseTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      errorRate: (metrics.length - successfulRequests.length) / metrics.length,
      shadowMismatchRate: shadowMismatches.length / metrics.length,
      lastError: lastError?.error,
      lastErrorTime: lastError?.timestamp
    };
  }
  
  // Export metrics for analysis
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = 'timestamp,operation,endpoint,duration,success,error,clientType,shadowMismatch';
      const rows = this.metrics.map(m => 
        `${m.timestamp},${m.operation},${m.endpoint},${m.duration},${m.success},${m.error || ''},${m.clientType},${m.shadowMismatch || false}`
      );
      return [headers, ...rows].join('\n');
    }
    
    return JSON.stringify(this.metrics, null, 2);
  }
  
  // Clear old metrics
  clearMetrics(): void {
    this.metrics = [];
    this.errorCount = 0;
    this.consecutiveErrors = 0;
  }
  
  // Get real-time status
  getStatus(): {
    isHealthy: boolean;
    consecutiveErrors: number;
    totalErrors: number;
    recentHealth: HealthMetrics;
  } {
    const recentHealth = this.getHealthMetrics(1); // Last minute
    
    return {
      isHealthy: this.consecutiveErrors < 5 && recentHealth.errorRate < 0.1,
      consecutiveErrors: this.consecutiveErrors,
      totalErrors: this.errorCount,
      recentHealth
    };
  }
}

// Global monitor instance
const monitor = new ApiMonitor();

// Helper function to wrap API calls with monitoring
export function withMonitoring<T>(
  operation: string,
  endpoint: string,
  clientType: 'legacy' | 'generated',
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  return apiCall()
    .then(result => {
      monitor.recordMetric({
        operation,
        endpoint,
        duration: Date.now() - startTime,
        success: true,
        clientType
      });
      return result;
    })
    .catch(error => {
      monitor.recordMetric({
        operation,
        endpoint,
        duration: Date.now() - startTime,
        success: false,
        error: error.message || String(error),
        clientType
      });
      throw error;
    });
}

// Helper function to record shadow validation results
export function recordShadowValidation(
  operation: string,
  endpoint: string,
  hasMismatch: boolean
): void {
  monitor.recordMetric({
    operation,
    endpoint,
    duration: 0,
    success: true,
    clientType: 'generated',
    shadowMismatch: hasMismatch
  });
}

// Export monitor functions
export const apiMonitor = {
  recordMetric: monitor.recordMetric.bind(monitor),
  getHealthMetrics: monitor.getHealthMetrics.bind(monitor),
  getPerformanceComparison: monitor.getPerformanceComparison.bind(monitor),
  exportMetrics: monitor.exportMetrics.bind(monitor),
  clearMetrics: monitor.clearMetrics.bind(monitor),
  getStatus: monitor.getStatus.bind(monitor)
};

// CLI-friendly status function
export function printMonitoringStatus(): void {
  const status = monitor.getStatus();
  const health = monitor.getHealthMetrics(5);
  
  console.log('📊 API Migration Monitoring Status');
  console.log('==================================');
  console.log(`Health Status: ${status.isHealthy ? '✅ Healthy' : '⚠️  Issues Detected'}`);
  console.log(`Consecutive Errors: ${status.consecutiveErrors}`);
  console.log(`Total Errors: ${status.totalErrors}`);
  console.log('');
  console.log('Last 5 Minutes:');
  console.log(`  Total Requests: ${health.totalRequests}`);
  console.log(`  Success Rate: ${(health.successRate * 100).toFixed(1)}%`);
  console.log(`  Error Rate: ${(health.errorRate * 100).toFixed(1)}%`);
  console.log(`  Avg Response Time: ${health.averageResponseTime.toFixed(0)}ms`);
  console.log(`  Shadow Mismatch Rate: ${(health.shadowMismatchRate * 100).toFixed(1)}%`);
  
  if (health.lastError) {
    console.log(`  Last Error: ${health.lastError}`);
    console.log(`  Last Error Time: ${new Date(health.lastErrorTime!).toISOString()}`);
  }
}