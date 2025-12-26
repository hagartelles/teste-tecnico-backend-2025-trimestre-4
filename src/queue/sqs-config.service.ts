import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface QueueConfig {
  name: string;
  queueUrl: string;
  region: string;
}

@Injectable()
export class SqsConfigService {
  constructor(private readonly configService: ConfigService) {}

  getProducerConfig(): QueueConfig {
    return this.buildQueueConfig();
  }

  getConsumerConfig(): QueueConfig {
    return this.buildQueueConfig();
  }

  private buildQueueConfig(): QueueConfig {
    const endpoint = this.configService.getOrThrow<string>('SQS_ENDPOINT');
    const region = this.configService.getOrThrow<string>('AWS_REGION');
    const accountId = this.configService.getOrThrow<string>('AWS_ACCOUNT_ID');
    const queueName = this.configService.getOrThrow<string>('QUEUE_NAME');
    
    const queueUrl = `${endpoint}/${accountId}/${queueName}`;

    return {
      name: queueName,
      queueUrl,
      region,
    };
  }

  getQueueUrl(): string {
    return this.buildQueueConfig().queueUrl;
  }
}