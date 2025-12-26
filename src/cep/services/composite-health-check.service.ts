import { Injectable, OnModuleInit } from '@nestjs/common';
import type { IHealthCheckService, HealthCheckResult } from '../interfaces/health-check.interface';

/**
 *@description Composite health check that can manages multiple providers
 */
@Injectable()
export class CompositeHealthCheckService implements IHealthCheckService, OnModuleInit {
    private providers: IHealthCheckService[] = [];

    constructor() { }

    registerProvider(provider: IHealthCheckService): void {
        this.providers.push(provider);
    }

    async onModuleInit() {
        await this.checkHealth();
    }

    async checkHealth(): Promise<boolean> {
        const results = await Promise.all(
            this.providers.map(p => p.checkHealth()),
        );

        // At least one provider must be healthy
        return results.some(r => r === true);
    }

    isServiceHealthy(): boolean {
        // At least one provider must be healthy
        return this.providers.some(p => p.isServiceHealthy());
    }

    getHealthStatus(): HealthCheckResult {
        const statuses = this.providers.map(p => p.getHealthStatus());

        const healthyProviders = statuses.filter(s => s.healthy);
        const allHealthy = healthyProviders.length === statuses.length;
        const anyHealthy = healthyProviders.length > 0;

        return {
            healthy: anyHealthy,
            lastCheck: new Date(),
            consecutiveFailures: allHealthy ? 0 : statuses.length - healthyProviders.length,
            provider: `Composite(${statuses.map(s => s.provider).join(', ')})`,
        };
    }

    async waitForHealthy(timeoutMs = 30000): Promise<void> {
        const startTime = Date.now();

        while (!this.isServiceHealthy() && Date.now() - startTime < timeoutMs) {
            await this.checkHealth();

            if (!this.isServiceHealthy()) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        if (!this.isServiceHealthy()) {
            throw new Error('No CEP providers are available');
        }
    }

    /**
     *@description Get list of healthy providers
     */
    getHealthyProviders(): string[] {
        return this.providers
            .filter(p => p.isServiceHealthy())
            .map(p => p.getHealthStatus().provider);
    }

    /**
     *@description Get list of unhealthy providers
     */
    getUnhealthyProviders(): string[] {
        return this.providers
            .filter(p => !p.isServiceHealthy())
            .map(p => p.getHealthStatus().provider);
    }
}