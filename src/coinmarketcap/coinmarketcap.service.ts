// coinmarketcap.service.ts

import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import { ConfigService } from '@nestjs/config';
import { toTimestamp } from '../utilities';
import moment from 'moment';
import { NATIVE_TOKEN } from '../deployment/deployment.service';

export interface PriceObject {
  timestamp: number;
  price: number;
}

const MAX_RESULTS_PER_CALL = 10000;
const INTERVAL_IN_MINUTES = 360;
const HBAR_ID = 4642;

@Injectable()
export class CoinMarketCapService {
  private readonly baseURL = 'https://pro-api.coinmarketcap.com';

  constructor(private readonly configService: ConfigService) {
    this.baseURL = this.configService.get('COINMARKETCAP_API_URL');
  }

  private getApiKey(): string {
    return this.configService.get<string>('COINMARKETCAP_API_KEY');
  }

  private async getTokenIds(tokenAddresses: string[]): Promise<string[]> {
    const apiKey = this.getApiKey();
    const infoUrl = `${this.baseURL}/v1/cryptocurrency/map`;

    try {
      const response = await axios.get(infoUrl, {
        params: {
          aux: 'platform',
        },
        headers: { 'X-CMC_PRO_API_KEY': apiKey },
      });

      const data = response.data.data;

      const tokenIds = tokenAddresses.map((address) => {
        if (address.toLowerCase() === NATIVE_TOKEN.toLowerCase()) {
          return HBAR_ID.toString();
        }
        const foundToken = data.find((token) => token.platform?.token_address.toLowerCase() === address.toLowerCase());
        return foundToken ? foundToken.id.toString() : null;
      });

      return tokenIds.filter((id) => id !== null);
    } catch (error) {
      throw error;
    }
  }

  private async getV3CryptocurrencyQuotesHistorical(params: any): Promise<AxiosResponse> {
    const apiKey = this.getApiKey();
    const url = `${this.baseURL}/v3/cryptocurrency/quotes/historical`;

    try {
      const response = await axios.get(url, { params, headers: { 'X-CMC_PRO_API_KEY': apiKey } });
      return response;
    } catch (error) {
      throw error;
    }
  }

  private async getV1CryptocurrencyListingsLatest(): Promise<any> {
    const apiUrl = `${this.baseURL}/v1/cryptocurrency/listings/latest`;
    const apiKey = this.getApiKey();
    const limit = 5000;
    const result: any[] = [];

    try {
      let start = 1;

      while (true) {
        const response = await axios.get(apiUrl, {
          params: {
            convert: 'USD',
            limit,
            start,
            cryptocurrency_type: 'tokens',
          },
          headers: { 'X-CMC_PRO_API_KEY': apiKey },
        });

        const responseData = response.data.data;
        if (!responseData || responseData.length === 0) {
          break;
        }

        responseData.forEach(async (d) => {
          if (d.platform && d.platform.slug === 'hedera') {
            // Convert Hedera token ID to EVM address using TokenId
            const { TokenId } = await import('@hashgraph/sdk');
            const evmTokenAddress = TokenId.fromString(d.platform.token_address).toSolidityAddress();
            result.push({
              tokenAddress: `0x${evmTokenAddress.toLowerCase()}`,
              usd: d.quote.USD.price,
              timestamp: d.last_updated,
              provider: 'coinmarketcap',
            });
          }
        });

        start += responseData.length;

        if (responseData.length < limit) {
          break;
        }
      }

      return result;
    } catch (error) {
      // Handle errors here
      throw error;
    }
  }

  private async getV1CryptocurrencyMapTokens(): Promise<any[]> {
    const apiUrl = `${this.baseURL}/v1/cryptocurrency/map`;
    const apiKey = this.getApiKey();
    const limit = 5000;
    const result: any[] = [];

    try {
      let start = 1;

      while (true) {
        const response = await axios.get(apiUrl, {
          params: {
            listing_status: 'active',
            limit,
            start,
          },
          headers: { 'X-CMC_PRO_API_KEY': apiKey },
        });

        const responseData = response.data.data;
        if (!responseData || responseData.length === 0) {
          break;
        }

        // Filter out tokens with null platform and include only Hedera tokens
        const hederaTokens = responseData.filter((token) => token.platform && token.platform.slug === 'hedera');

        result.push(...hederaTokens);
        start += responseData.length;

        if (responseData.length < limit) {
          break;
        }
      }
      result.push({
        id: HBAR_ID,
        platform: { token_address: NATIVE_TOKEN.toLowerCase() },
      });
      return result;
    } catch (error) {
      // Handle errors here
      throw error;
    }
  }

  private async getV2CryptocurrencyQuotesLatest(ids: number[]): Promise<any> {
    const apiUrl = `${this.baseURL}/v1/cryptocurrency/quotes/latest`;
    const apiKey = this.getApiKey();

    try {
      const response = await axios.get(apiUrl, {
        params: {
          convert: 'USD',
          id: ids.join(','),
        },
        headers: { 'X-CMC_PRO_API_KEY': apiKey },
      });

      const data = response.data.data;
      const result = [];
      Object.keys(data).forEach((key) => {
        const q = data[key];
        const tokenAddress = q.id === HBAR_ID ? NATIVE_TOKEN.toLowerCase() : q.platform.token_address.toLowerCase();
        result.push({
          tokenAddress,
          usd: q.quote.USD.price,
          timestamp: q.last_updated,
          provider: 'coinmarketcap',
        });
      });
      return result;
    } catch (error) {
      // Handle errors here
      throw error;
    }
  }

  async getHistoricalQuotes(
    tokenAddresses: string[],
    start: number,
    end: number,
  ): Promise<{ [key: string]: PriceObject[] }> {
    try {
      const tokenIds = await this.getTokenIds(tokenAddresses);

      const totalDataPoints = Math.ceil(((end - start) / (INTERVAL_IN_MINUTES * 60)) * tokenAddresses.length);
      const batches = Math.ceil(totalDataPoints / MAX_RESULTS_PER_CALL);
      const intervalInSeconds = Math.ceil((end - start) / batches);

      const requests = [];

      for (let i = 0; i < batches; i++) {
        const intervalStart = moment.unix(start + i * intervalInSeconds).toISOString(true);
        const intervalEnd = moment.unix(Math.min(start + (i + 1) * intervalInSeconds, end)).toISOString(true);

        const params = {
          id: tokenIds.join(','),
          time_start: intervalStart,
          time_end: intervalEnd,
          interval: '6h',
        };

        requests.push(this.getV3CryptocurrencyQuotesHistorical(params));
      }

      const responses: AxiosResponse[] = await Promise.all(requests);

      const result = {};
      responses.forEach((response) => {
        Object.keys(response.data.data).forEach((id) => {
          const tokenAddress = tokenAddresses[tokenIds.indexOf(id)];
          const prices = response.data.data[id].quotes.map((q) => {
            const { price, timestamp } = q.quote.USD;
            return { price, timestamp: toTimestamp(timestamp), address: tokenAddress.toLowerCase() };
          });

          result[tokenAddress] = (result[tokenAddress] || []).concat(prices);
        });
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async getLatestQuotes(): Promise<any> {
    const latestQuotes = await this.getV1CryptocurrencyListingsLatest();
    const nativeTokenQuotes = await this.getV2CryptocurrencyQuotesLatest([HBAR_ID]);
    return [...latestQuotes, ...nativeTokenQuotes];
  }

  async getAllTokens(): Promise<any[]> {
    return await this.getV1CryptocurrencyMapTokens();
  }
}
