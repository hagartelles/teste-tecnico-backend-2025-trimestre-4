import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { CrawlRequest } from './crawl-request.schema';
import type { ViaCepResponse } from '../cep/interfaces/viacep.interface';

export type CrawlResultDocument = HydratedDocument<CrawlResult>;

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia?: string;
  ddd: string;
  siafi: string;
}

@Schema({ timestamps: true })
export class CrawlResult {
  @Prop({ type: Types.ObjectId, ref: 'CrawlRequest', required: true })
  crawl_id!: CrawlRequest;

  @Prop({ required: true, index: true })
  cep!: string;

  @Prop({ type: Object })
  data?: ViaCepResponse;

  @Prop({ required: true })
  success!: boolean;

  @Prop()
  error_message?: string;

  @Prop({ default: 0 })
  retry_count?: number;
}

export const CrawlResultSchema = SchemaFactory.createForClass(CrawlResult);

// Unique composite index to avoid duplicates
CrawlResultSchema.index({ crawl_id: 1, cep: 1 }, { unique: true });
// Index for quickly counting successes/errors 
CrawlResultSchema.index({ crawl_id: 1, success: 1 });