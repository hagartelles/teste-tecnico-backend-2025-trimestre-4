import { Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import type { IHealthCheckService, HealthCheckResult } from '../interfaces/health-check.interface';

export abstract class BaseHealthCheckService implements IHealthCheckService {
  protected readonly logger: Logger;
  protected isHealthy = false;
  protected lastCheck: Date | null = null;
  protected consecutiveFailures = 0;
  protected readonly maxFailures = 3;
  protected readonly checkIntervalMs = 60000; // 60 seconds

  constructor(
    protected readonly providerName: string,
  ) {
    this.logger = new Logger(`${providerName}HealthCheck`);
  }

  abstract performHealthCheck(): Promise<boolean>;

  async checkHealth(): Promise<boolean> {
    try {
      this.logger.debug(`Checking ${this.providerName} health...`);

      const isHealthy = await this.performHealthCheck();
      
      this.lastCheck = new Date();

      if (isHealthy) {
        this.isHealthy = true;
        this.consecutiveFailures = 0;
        this.logger.log(`${this.providerName} service is healthy`);
        return true;
      }

      throw new Error(`Health check returned false`);
    } catch (error: any) {
      this.consecutiveFailures++;
      this.lastCheck = new Date();

      if (this.consecutiveFailures >= this.maxFailures) {
        this.isHealthy = false;
        this.logger.error(
          `${this.providerName} service is down (${this.consecutiveFailures} consecutive failures)`,
        );
      } else {
        this.logger.warn(`${this.providerName} health check failed: ${error.message}`);
      }

      return false;
    }
  }

  @Interval(60000)
  async periodicHealthCheck() {
    await this.checkHealth();
  }

  isServiceHealthy(): boolean {
    return this.isHealthy;
  }

  getHealthStatus(): HealthCheckResult {
    return {
      healthy: this.isHealthy,
      lastCheck: this.lastCheck,
      consecutiveFailures: this.consecutiveFailures,
      provider: this.providerName,
    };
  }

  async waitForHealthy(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();

    while (!this.isHealthy && Date.now() - startTime < timeoutMs) {
      this.logger.log(`Waiting for ${this.providerName} service to become healthy...`);
      await this.checkHealth();
      
      if (!this.isHealthy) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    if (!this.isHealthy) {
      throw new Error(`${this.providerName} service is not available`);
    }
  }
}