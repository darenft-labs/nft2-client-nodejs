import {Service} from 'typedi';
import {AuthService} from './auth.service';
import {ProviderSchemaResponse} from '../types/interfaces';

@Service()
export class ProviderService {
  constructor(private authService: AuthService) {}

  async getProviderSchema(
    providerAddress: string
  ): Promise<ProviderSchemaResponse> {
    const result = await this.authService.auth.request<ProviderSchemaResponse>({
      url: `${this.authService.getHostPath()}/client/nft-schemas/${providerAddress}`,
      method: 'GET',
    });

    return result?.data;
  }
}
