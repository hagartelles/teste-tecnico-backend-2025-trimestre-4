import { IsString, Matches, IsNotEmpty } from 'class-validator';
import { IsCepRangeValid } from '../validators/cep-range.validator'; 

export class CreateCrawlDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep_start must contain exactly 8 numeric digits.' })
  cep_start: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'The zip code address must contain exactly 8 numeric digits.' })
  @IsCepRangeValid()
  cep_end: string;
}