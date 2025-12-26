import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { BaseHealthCheckService } from './base-health-check.service';

@Injectable()
export class ViaCepHealthService extends BaseHealthCheckService implements OnModuleInit {
  private readonly baseUrl: string;
  private readonly testCep: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super('ViaCEP');
    this.baseUrl = this.configService.getOrThrow<string>('VIACEP_BASE_URL');
    this.testCep = this.configService.getOrThrow<string>('VIACEP_TEST_CEP');
  }

  async onModuleInit() {
    await this.checkHealth();
  }

  async performHealthCheck(): Promise<boolean> {
    const url = `${this.baseUrl}/${this.testCep}/json/`;

    const response = await firstValueFrom(
      this.httpService.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'CEP-Crawler/1.0',
        },
      }),
    );

    return response.status === 200 && !response.data.erro;
  }
}