// src/cep/cep.worker.ts

import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { SqsMessageHandler } from '@ssut/nestjs-sqs';
import type { Message } from '@aws-sdk/client-sqs';
import Bottleneck from 'bottleneck';
import { CepService } from './cep.service';
import type { ICepProvider } from './interfaces/cep-provider.interface';
import { CEP_PROVIDER } from './interfaces/cep-provider.interface';

interface CepMessage {
  crawl_id: string;
  cep: string;
}

@Injectable()
export class CepWorker implements OnModuleInit {
  private readonly logger = new Logger(CepWorker.name);
  private limiter: Bottleneck;

  constructor(
    private readonly cepService: CepService,
    @Inject(CEP_PROVIDER) private readonly cepProvider: ICepProvider,
  ) {}

  onModuleInit() {
    this.limiter = new Bottleneck({
      minTime: 350,
      maxConcurrent: 1,
    });

    this.logger.log('CepWorker initialized with rate limiting');
  }

  @SqsMessageHandler('cep-queue', false)
  async handleMessage(message: Message) {
    try {
      if (!message.Body) {
        this.logger.error('Message body is empty');
        return;
      }

      const body = JSON.parse(message.Body) as CepMessage;
      const { crawl_id, cep } = body;

      this.logger.debug(`Processing CEP ${cep} for crawl ${crawl_id}`);

      await this.updateCrawlStatusToRunning(crawl_id);
      await this.limiter.schedule(() => this.processCep(crawl_id, cep));

      this.logger.debug(`Successfully processed CEP ${cep}`);
    } catch (error: any) {
      this.logger.error(`Error processing message: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async updateCrawlStatusToRunning(crawlId: string): Promise<void> {
    try {
      const status = await this.cepService.getCrawlStatus(crawlId);
      if (status && status.status === 'pending') {
        await this.cepService.updateCrawlStatus(crawlId, {
          status: 'running',
          started_at: new Date(),
        });
        this.logger.log(`Crawl ${crawlId} status updated to 'running'`);
      }
    } catch (error: any) {
      this.logger.warn(`Failed to update crawl status to running: ${error.message}`);
    }
  }

  private async processCep(crawlId: string, cep: string): Promise<void> {
    try {
      const result = await this.cepProvider.fetchCep(cep);

      if (result.notFound) {
        await this.cepService.saveCrawlResult(
          crawlId,
          cep,
          false,
          null,
          result.error || 'CEP not found',
        );
        await this.cepService.incrementProgress(crawlId, false);
        return;
      }

      if (!result.success) {
        this.logger.error(`Error fetching CEP ${cep}: ${result.error}`);
        
        await this.cepService.saveCrawlResult(
          crawlId,
          cep,
          false,
          null,
          result.error || 'Error fetching CEP',
        );
        await this.cepService.incrementProgress(crawlId, false);
        
        if (result.error?.includes('429')) {
          throw new Error(result.error);
        }
        return;
      }

      await this.cepService.saveCrawlResult(crawlId, cep, true, result.data);
      await this.cepService.incrementProgress(crawlId, true);
    } catch (error: any) {
      this.logger.error(`Unexpected error processing CEP ${cep}: ${error.message}`);
      
      await this.cepService.saveCrawlResult(
        crawlId,
        cep,
        false,
        null,
        error.message || 'Unexpected error',
      );
      await this.cepService.incrementProgress(crawlId, false);
      
      throw error;
    }
  }
}