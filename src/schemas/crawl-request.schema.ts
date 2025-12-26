import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CrawlRequestDocument = HydratedDocument<CrawlRequest>;

@Schema({ timestamps: true })
export class CrawlRequest {
  @Prop({ required: true })
  cep_start!: string;

  @Prop({ required: true })
  cep_end!: string;

  @Prop({ default: 0 })
  total_ceps!: number;

  @Prop({ default: 0 })
  processed_count!: number;

  @Prop({ default: 0 })
  success_count!: number;

  @Prop({ default: 0 })
  error_count!: number;

  @Prop({
    required: true,
    enum: ['pending', 'running', 'finished', 'failed'],
    default: 'pending',
    index: true
  })
  status!: string;

  @Prop()
  started_at?: Date;

  @Prop()
  finished_at?: Date;
}

export const CrawlRequestSchema = SchemaFactory.createForClass(CrawlRequest);

//Composite index for efficient queries
CrawlRequestSchema.index({ status: 1, createdAt: -1 });