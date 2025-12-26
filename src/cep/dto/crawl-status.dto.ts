export class CrawlStatusDto {
  crawl_id: string;
  cep_start: string;
  cep_end: string;
  total_ceps: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  status: 'pending' | 'running' | 'finished' | 'failed';
  started_at?: Date;
  finished_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export class CrawlResponseDto {
  crawl_id: string;
  message: string;
  total_ceps: number;
}

export class CrawlResultItemDto {
  cep: string;
  success: boolean;
  data?: any;
  error_message?: string;
  created_at: Date;
}

export class CrawlResultsDto {
  crawl_id: string;
  results: CrawlResultItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}