import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CepService } from './cep.service';
import { CreateCrawlDto } from './dto/crawl-create.dto';
import { CrawlResponseDto, CrawlStatusDto, CrawlResultsDto } from './dto/crawl-status.dto';

@Controller('cep')
export class CepController {
  constructor(private readonly cepService: CepService) {}

  /**
   * @description Requests the processing of a range of postal codes.
   */
  @Post('crawl')
  @HttpCode(HttpStatus.ACCEPTED)
  async createCrawl(@Body() createCrawlDto: CreateCrawlDto): Promise<CrawlResponseDto> {
    try {
      const result = await this.cepService.createCrawlRequest(createCrawlDto);
      return result;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * @description Check the status of a process.
   */
  @Get('crawl/:crawl_id')
  async getCrawlStatus(@Param('crawl_id') crawl_id: string): Promise<CrawlStatusDto> {
    const status = await this.cepService.getCrawlStatus(crawl_id);

    if (!status) {
      throw new NotFoundException(`Crawl request with ID ${crawl_id} not found`);
    }

    return status;
  }

  /**
   * @description Returns the processed results.
   */
  @Get('crawl/:crawl_id/results')
  async getCrawlResults(
    @Param('crawl_id') crawl_id: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ): Promise<CrawlResultsDto> {
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    const results = await this.cepService.getCrawlResults(crawl_id, pageNum, limitNum);

    if (!results) {
      throw new NotFoundException(`Crawl request with ID ${crawl_id} not found`);
    }

    return results;
  }
}