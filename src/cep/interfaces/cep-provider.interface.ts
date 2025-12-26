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

export interface CepProviderResult {
  success: boolean;
  data?: CepData;
  error?: string;
  notFound?: boolean;
}

export interface ICepProvider {
  /**
   * Fetch CEP data from external API
   * @param cep - CEP code with 8 digits
   * @returns Query result with data or error
   */
  fetchCep(cep: string): Promise<CepProviderResult>;
}

export const CEP_PROVIDER = Symbol('CEP_PROVIDER');