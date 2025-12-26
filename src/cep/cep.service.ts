import { Injectable, Logger, ServiceUnavailableException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SqsService } from '@ssut/nestjs-sqs';
import { CrawlRequest, CrawlRequestDocument } from '../schemas/crawl-request.schema';
import { CrawlResult, CrawlResultDocument } from '../schemas/crawl-result.schema';
import { CreateCrawlDto } from './dto/crawl-create.dto';
import {
  CrawlResponseDto,
  CrawlStatusDto,
  CrawlResultsDto,
  CrawlResultItemDto,
} from './dto/crawl-status.dto';
import { SqsConfigService } from '../queue/sqs-config.service';
import type { IHealthCheckService } from './interfaces/health-check.interface';
import { HEALTH_CHECK_SERVICE } from './interfaces/health-check.interface';

@Injectable()
export class CepService {
  private readonly logger = new Logger(CepService.name);

  constructor(
    @InjectModel(CrawlRequest.name)
    private crawlRequestModel: Model<CrawlRequestDocument>,
    @InjectModel(CrawlResult.name)
    private crawlResultModel: Model<CrawlResultDocument>,
    private readonly sqsService: SqsService,
    private readonly sqsConfigService: SqsConfigService,
    @Inject(HEALTH_CHECK_SERVICE) private readonly healthCheckService: IHealthCheckService,
  ) {}

  async createCrawlRequest(dto: CreateCrawlDto): Promise<CrawlResponseDto> {
    // Check if CEP service is available (provider-agnostic)
    if (!this.healthCheckService.isServiceHealthy()) {
      this.logger.warn('CEP service is not healthy, checking status...');
      
      const isHealthy = await this.healthCheckService.checkHealth();
      
      if (!isHealthy) {
        const status = this.healthCheckService.getHealthStatus();
        throw new ServiceUnavailableException(
          `CEP service is currently unavailable. Provider: ${status.provider}, Last check: ${status.lastCheck}, Consecutive failures: ${status.consecutiveFailures}`,
        );
      }
    }

    const { cep_start, cep_end } = dto;

    const startNum = parseInt(cep_start, 10);
    const endNum = parseInt(cep_end, 10);
    const totalCeps = endNum - startNum + 1;

    this.logger.log(`Creating crawl request for range ${cep_start} to ${cep_end} (${totalCeps} CEPs)`);

    const crawlRequest = new this.crawlRequestModel({
      cep_start,
      cep_end,
      total_ceps: totalCeps,
      status: 'pending',
    });

    const saved = await crawlRequest.save();
    const crawlId = saved._id.toString();

    await this.enqueueCeps(crawlId, startNum, endNum);

    this.logger.log(`Crawl request ${crawlId} created and ${totalCeps} messages enqueued`);

    return {
      crawl_id: crawlId,
      message: 'Crawl request created successfully',
      total_ceps: totalCeps,
    };
  }

private async enqueueCeps(crawlId: string, start: number, end: number): Promise<void> {
  const queueName = this.sqsConfigService.getProducerConfig().name;
  
  for (let cep = start; cep <= end; cep++) {
    const cepStr = cep.toString().padStart(8, '0');
    
    const message = {
      id: `${crawlId}-${cepStr}`,
      body: JSON.stringify({
        crawl_id: crawlId,
        cep: cepStr,
      }),
    };

    try {
      await this.sqsService.send(queueName, message); 
    } catch (error: any) {
      this.logger.error(`Failed to enqueue CEP ${cepStr}: ${error.message}`);
      throw error;
    }
  }
}

  async getCrawlStatus(crawlId: string): Promise<CrawlStatusDto | null> {
    if (!Types.ObjectId.isValid(crawlId)) {
      return null;
    }

    const crawlRequest = await this.crawlRequestModel.findById(crawlId).lean().exec();

    if (!crawlRequest) {
      return null;
    }

    return {
      crawl_id: crawlId,
      cep_start: crawlRequest.cep_start,
      cep_end: crawlRequest.cep_end,
      total_ceps: crawlRequest.total_ceps,
      processed_count: crawlRequest.processed_count,
      success_count: crawlRequest.success_count,
      error_count: crawlRequest.error_count,
      status: crawlRequest.status as any,
      started_at: crawlRequest.started_at,
      finished_at: crawlRequest.finished_at,
      created_at: (crawlRequest as any).createdAt,
      updated_at: (crawlRequest as any).updatedAt,
    };
  }

  async getCrawlResults(
    crawlId: string,
    page: number,
    limit: number,
  ): Promise<CrawlResultsDto | null> {
    if (!Types.ObjectId.isValid(crawlId)) {
      return null;
    }

    const crawlObjectId = new Types.ObjectId(crawlId);

    const crawlExists = await this.crawlRequestModel.exists({ _id: crawlObjectId });
    if (!crawlExists) {
      return null;
    }

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      this.crawlResultModel
        .find({ crawl_id: crawlObjectId } as any)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.crawlResultModel.countDocuments({ crawl_id: crawlObjectId } as any),
    ]);

    const items: CrawlResultItemDto[] = results.map((r: any) => ({
      cep: r.cep,
      success: r.success,
      data: r.data,
      error_message: r.error_message,
      created_at: r.createdAt,
    }));

    return {
      crawl_id: crawlId,
      results: items,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async updateCrawlStatus(crawlId: string, updates: Partial<CrawlRequest>): Promise<void> {
    await this.crawlRequestModel.findByIdAndUpdate(crawlId, updates).exec();
  }

  async incrementProgress(crawlId: string, success: boolean): Promise<void> {
    const update = {
      $inc: {
        processed_count: 1,
        ...(success ? { success_count: 1 } : { error_count: 1 }),
      },
    };

    const result = await this.crawlRequestModel.findByIdAndUpdate(
      crawlId,
      update,
      { new: true },
    ).exec();

    if (result && result.processed_count >= result.total_ceps) {
      await this.crawlRequestModel.findByIdAndUpdate(crawlId, {
        status: 'finished',
        finished_at: new Date(),
      }).exec();
      this.logger.log(`Crawl ${crawlId} finished. Success: ${result.success_count}, Errors: ${result.error_count}`);
    }
  }

  async saveCrawlResult(
    crawlId: string,
    cep: string,
    success: boolean,
    data?: any,
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.crawlResultModel.create({
        crawl_id: new Types.ObjectId(crawlId),
        cep,
        success,
        data,
        error_message: errorMessage,
        retry_count: 0,
      } as any);
    } catch (error: any) {
      if (error.code === 11000) {
        this.logger.warn(`Duplicate result for CEP ${cep} in crawl ${crawlId}`);
        return;
      }
      throw error;
    }
  }
}