import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';
import { CepController } from './cep.controller';
import { CepService } from './cep.service';
import { CepWorker } from './cep.worker';
import { ViaCepHealthService } from './services/viacep-health.service';
import { CrawlRequest, CrawlRequestSchema } from '../schemas/crawl-request.schema';
import { CrawlResult, CrawlResultSchema } from '../schemas/crawl-result.schema';
import { QueueModule } from '../queue/queue.module';
import { ViaCepProvider } from './providers/viacep.provider';
import { CEP_PROVIDER } from './interfaces/cep-provider.interface';
import { HEALTH_CHECK_SERVICE } from './interfaces/health-check.interface';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CrawlRequest.name, schema: CrawlRequestSchema },
      { name: CrawlResult.name, schema: CrawlResultSchema },
    ]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    ScheduleModule.forRoot(),
    QueueModule,
  ],
  controllers: [CepController],
  providers: [
    CepService,
    CepWorker,
    ViaCepHealthService,
    {
      provide: CEP_PROVIDER,
      useClass: ViaCepProvider,
    },
    {
      provide: HEALTH_CHECK_SERVICE,
      useExisting: ViaCepHealthService,
    },
  ],
  exports: [CepService],
})
export class CepModule {}