import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { BlockchainType, Deployment } from '../deployment/deployment.service';

export const NETWORK_IDS = {
  [BlockchainType.Hedera]: 'hedera-hashgraph',
  [BlockchainType.Ethereum]: 'ethereum'
};

@Injectable()
export class CoinGeckoService {
  private readonly logger = new Logger(CoinGeckoService.name);
  constructor(private configService: ConfigService) {
    this.baseURL = this.configService.get('COINGECKO_API_URL');
  }

  private readonly baseURL = 'https://pro-api.coingecko.com/api/v3';

  async getLatestPrices(contractAddresses: string[], deployment: Deployment, convert = ['usd']): Promise<any> {
    const apiKey = this.configService.get('COINGECKO_API_KEY');
    const blockchainType = deployment.blockchainType;
    const batchSize = 150;

    try {
      const batches: string[][] = [];
      for (let i = 0; i < contractAddresses.length; i += batchSize) {
        const batch = contractAddresses.slice(i, i + batchSize);
        batches.push(batch);
      }

      const requests = batches.map(async (batch) => {
        return axios.get(`${this.baseURL}/simple/token_price/${NETWORK_IDS[blockchainType]}`, {
          params: {
            contract_addresses: batch.join(','),
            vs_currencies: convert.join(','),
            include_last_updated_at: true,
          },
          headers: {
            [this.configService.get('COINGECKO_API_AUTH_HEADER')]: apiKey,
          },
        });
      });

      const responses = await Promise.all(requests);
      let result = {};
      responses.forEach((r) => {
        result = { ...result, ...r.data };
      });

      for (const key in result) {
        result[key]['provider'] = 'coingecko';
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to fetch latest token prices: ${error.message}`);
    }
  }

  async fetchLatestPrice(deployment: Deployment, address: string, convert = ['usd']): Promise<any> {
    try {
      let price;
      if (address.toLowerCase() === deployment.gasToken.address.toLowerCase()) {
        price = await this.getLatestGasTokenPrice(deployment, convert);
      } else {
        price = await this.getLatestPrices([address], deployment, convert);
      }
      return price;
    } catch (error) {
      this.logger.error(`Error fetching price: ${error.message}`);
    }
  }

  async getLatestGasTokenPrice(deployment: Deployment, convert = ['usd']): Promise<any> {
    const apiKey = this.configService.get('COINGECKO_API_KEY');
    const blockchainType = deployment.blockchainType;
    const gasToken = deployment.gasToken;

    try {
      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: NETWORK_IDS[blockchainType],
          vs_currencies: convert.join(','),
          include_last_updated_at: true,
        },
        headers: {
            [this.configService.get('COINGECKO_API_AUTH_HEADER')]: apiKey,
        },
      });

      const result = {
        [gasToken.address.toLowerCase()]: {
          last_updated_at: response.data[NETWORK_IDS[blockchainType]]['last_updated_at'],
          provider: 'coingecko',
        },
      };
      convert.forEach((c) => {
        result[gasToken.address.toLowerCase()][c.toLowerCase()] = response.data[NETWORK_IDS[blockchainType]][c.toLowerCase()];
      });
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch latest gas token prices: ${error.message}`);
    }
  }

  async getCoinPrices(coinIds: string[], convert = ['usd']): Promise<any> {
    const apiKey = this.configService.get('COINGECKO_API_KEY');
    const batchSize = 150;

    try {
      const batches: string[][] = [];
      for (let i = 0; i < coinIds.length; i += batchSize) {
        const batch = coinIds.slice(i, i + batchSize);
        batches.push(batch);
      }

      const requests = batches.map(async (batch) => {
        return axios.get(`${this.baseURL}/simple/price`, {
          params: {
            ids: batch.join(','),
            vs_currencies: convert.join(','),
            include_last_updated_at: true,
          },
          headers: {
            [this.configService.get('COINGECKO_API_AUTH_HEADER')]: apiKey,
          },
        });
      });

      const responses = await Promise.all(requests);
      let result = {};
      responses.forEach((r) => {
        result = { ...result, ...r.data };
      });

      return result;
    } catch (error) {
      throw new Error(`Failed to fetch latest coin prices: ${error.message}`);
    }
  }
}
