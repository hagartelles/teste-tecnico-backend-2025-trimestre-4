export interface HealthCheckResult {
  healthy: boolean;
  lastCheck: Date | null;
  consecutiveFailures: number;
  provider: string;
}

export interface IHealthCheckService {
  
  //Check if the service is currently healthy
  isServiceHealthy(): boolean;

  // Perform a health check
  checkHealth(): Promise<boolean>;

  //Get detailed health status
  getHealthStatus(): HealthCheckResult;

  //Get detailed health status
  waitForHealthy(timeoutMs?: number): Promise<void>;
}

export const HEALTH_CHECK_SERVICE = Symbol('HEALTH_CHECK_SERVICE');