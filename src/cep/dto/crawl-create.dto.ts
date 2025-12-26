import { IsString, Matches, IsNotEmpty } from 'class-validator';
import { IsCepRangeValid } from '../validators/cep-range.validator'; 

export class CreateCrawlDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep_start deve conter exatamente 8 dígitos numéricos' })
  cep_start: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{8}$/, { message: 'cep_end deve conter exatamente 8 dígitos numéricos' })
  @IsCepRangeValid()
  cep_end: string;
}