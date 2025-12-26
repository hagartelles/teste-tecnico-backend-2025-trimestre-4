// src/queue/queue.module.ts

import { Module } from '@nestjs/common';
import { SqsModule } from '@ssut/nestjs-sqs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SqsConfigService } from './sqs-config.service';

@Module({
  imports: [
    ConfigModule,
    SqsModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const endpoint = configService.getOrThrow<string>('SQS_ENDPOINT');
        const region = configService.getOrThrow<string>('AWS_REGION');
        const accountId = configService.getOrThrow<string>('AWS_ACCOUNT_ID');
        const queueName = configService.getOrThrow<string>('QUEUE_NAME');

        const queueUrl = `${endpoint}/${accountId}/${queueName}`;

        // Create SQSClient with ElasticMQ endpoint
        const sqsClient = new SQSClient({
          region: region,
          endpoint: endpoint,
          credentials: {
            accessKeyId: configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
            secretAccessKey: configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
          },
        });

        return {
          consumers: [
            {
              name: queueName,        
              queueUrl: queueUrl,
              region: region,
              sqs: sqsClient,
            },
          ],
          producers: [
            {
              name: queueName,        
              queueUrl: queueUrl,    
              region: region,
              sqs: sqsClient,
            },
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SqsConfigService],
  exports: [SqsModule, SqsConfigService],
})
export class QueueModule {}