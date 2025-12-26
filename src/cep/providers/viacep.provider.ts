import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import type { ICepProvider, CepProviderResult, CepData } from '../interfaces/cep-provider.interface';

interface ViaCepResponse {
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
  erro?: boolean;
}

@Injectable()
export class ViaCepProvider implements ICepProvider {
  private readonly logger = new Logger(ViaCepProvider.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,) {
      this.baseUrl = this.configService.getOrThrow<string>('VIACEP_BASE_URL');
     }

  async fetchCep(cep: string): Promise<CepProviderResult> {
    const url = `${this.baseUrl}/${cep}/json/`;

    try {
      this.logger.debug(`Fetching CEP ${cep} from ViaCEP`);

      const response = await firstValueFrom(
        this.httpService.get<ViaCepResponse>(url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'CEP-Crawler/1.0',
            'Connection': 'keep-alive', // Reuse connections
          },
        }),
      );

      if (response.data.erro) {
        return {
          success: false,
          notFound: true,
          error: 'CEP not found',
        };
      }

      const cepData: CepData = {
        cep: response.data.cep,
        logradouro: response.data.logradouro,
        complemento: response.data.complemento,
        bairro: response.data.bairro,
        localidade: response.data.localidade,
        uf: response.data.uf,
        ibge: response.data.ibge,
        gia: response.data.gia,
        ddd: response.data.ddd,
        siafi: response.data.siafi,
      };

      return {
        success: true,
        data: cepData,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching CEP ${cep}: ${error.message}`);

      if (error.response) {
        return {
          success: false,
          error: `HTTP ${error.response.status}: ${error.message}`,
        };
      }

      return {
        success: false,
        error: `Network error: ${error.message}`,
      };
    }
  }
}