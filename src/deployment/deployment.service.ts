// deployment.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventTypes } from '../events/event-types';

export const NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export enum BlockchainType {
  Ethereum = 'ethereum',
  HederaTesnet='hederatestnet'
}

export enum ExchangeId {
  OGEthereum = 'ethereum',
  OGHederaTestnet = 'hederatestnet'
}

export interface GasToken {
  name: string;
  symbol: string;
  address: string;
}

export interface Deployment {
  exchangeId: ExchangeId;
  blockchainType: BlockchainType;
  rpcEndpoint: string;
  harvestEventsBatchSize: number;
  harvestConcurrency: number;
  harvestSleep?: number;
  multicallAddress: string;
  gasToken: GasToken;
  startBlock: number;
  nativeTokenAlias?: string;
  mapEthereumTokens?: {
    [deploymentTokenAddress: string]: string;
  };
  contracts: {
    [contractName: string]: {
      address: string;
    };
  };
  notifications?: {
    explorerUrl: string;
    carbonWalletUrl: string;
    disabledEvents?: EventTypes[];
    regularGroupEvents?: EventTypes[];
    title: string;
    telegram: {
      botToken: string;
      bancorProtectionToken?: string;
      threads: {
        carbonThreadId?: number;
        fastlaneId?: number;
        vortexId?: number;
        bancorProtectionId?: number;
      };
    };
  };
}

export type LowercaseTokenMap = { [lowercaseAddress: string]: string };

@Injectable()
export class DeploymentService {
  private deployments: Deployment[];
  constructor(private configService: ConfigService) {
    this.deployments = this.initializeDeployments();
  }

  private initializeDeployments(): Deployment[] {
    return [
      {
        exchangeId: ExchangeId.OGHederaTestnet,
        blockchainType: BlockchainType.HederaTesnet,
        rpcEndpoint: this.configService.get('HEDERA_RPC_ENDPOINT'),
        harvestEventsBatchSize: 100000,
        harvestConcurrency: 10,
        multicallAddress: '0xA13f9bcdeFeD39A3D3709A7EBD4967e2759AF1fa',
        startBlock: 23297911,
        gasToken: {
          name: 'Hedera',
          symbol: 'HBAR',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        contracts: {
          CarbonController: {
            address: '0x6F482F9c45ea2e6076748dE289eE55B95654A1bA',
          },
          CarbonVortex: {
            address: '0x6461BEB4975c744B128B598b6b746E40D170E15E',
          },
          CarbonPOL: {
            address: '0xD06146D292F9651C1D7cf54A3162791DFc2bEf46',
          },
          CarbonVoucher: {
            address: '0x3660F04B79751e31128f6378eAC70807e38f554E',
          },
          BancorArbitrage: {
            address: '0x41Eeba3355d7D6FF628B7982F3F9D055c39488cB',
          },
          BancorArbitrageV2: {
            address: '0x0f54099D787e26c90c487625B4dE819eC5A9BDAA',
          },
          LiquidityProtectionStore: {
            address: '0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55',
          },
        },
        notifications: {
          explorerUrl: this.configService.get('ETHEREUM_EXPLORER_URL'),
          carbonWalletUrl: this.configService.get('ETHEREUM_CARBON_WALLET_URL'),
          title: 'Hedera Testnet',
          regularGroupEvents: [EventTypes.ProtectionRemovedEvent],
          telegram: {
            botToken: this.configService.get('ETHEREUM_TELEGRAM_BOT_TOKEN'),
            bancorProtectionToken: this.configService.get('ETHEREUM_BANCOR_PROTECTION_TOKEN'),
            threads: {
              carbonThreadId: this.configService.get('ETHEREUM_CARBON_THREAD_ID'),
              fastlaneId: this.configService.get('ETHEREUM_FASTLANE_THREAD_ID'),
              vortexId: this.configService.get('ETHEREUM_VORTEX_THREAD_ID'),
              bancorProtectionId: this.configService.get('ETHEREUM_BANCOR_PROTECTION_THREAD_ID'),
            },
          },
        },
        mapEthereumTokens: {
          '0xfc60fc0145d7330e5abcfc52af7b043a1ce18e7d': '0xfc60fc0145d7330e5abcfc52af7b043a1ce18e7d', // governer self mapping
        },
      },
      {
        exchangeId: ExchangeId.OGEthereum,
        blockchainType: BlockchainType.Ethereum,
        rpcEndpoint: this.configService.get('ETHEREUM_RPC_ENDPOINT'),
        harvestEventsBatchSize: 100000,
        harvestConcurrency: 10,
        multicallAddress: '0x5Eb3fa2DFECdDe21C950813C665E9364fa609bD2',
        startBlock: 17087000,
        gasToken: {
          name: 'Ethereum',
          symbol: 'ETH',
          address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        },
        contracts: {
          CarbonController: {
            address: '0xC537e898CD774e2dCBa3B14Ea6f34C93d5eA45e1',
          },
          CarbonVortex: {
            address: '0xD053Dcd7037AF7204cecE544Ea9F227824d79801',
          },
          CarbonPOL: {
            address: '0xD06146D292F9651C1D7cf54A3162791DFc2bEf46',
          },
          CarbonVoucher: {
            address: '0x3660F04B79751e31128f6378eAC70807e38f554E',
          },
          BancorArbitrage: {
            address: '0x41Eeba3355d7D6FF628B7982F3F9D055c39488cB',
          },
          BancorArbitrageV2: {
            address: '0x0f54099D787e26c90c487625B4dE819eC5A9BDAA',
          },
          LiquidityProtectionStore: {
            address: '0xf5FAB5DBD2f3bf675dE4cB76517d4767013cfB55',
          },
        },
      }
    ];
  }

  getDeployments(): Deployment[] {
    return this.deployments;
  }

  getDeploymentByExchangeId(exchangeId: ExchangeId): Deployment {
    const deployment = this.deployments.find((d) => d.exchangeId === exchangeId);
    if (!deployment) {
      throw new Error(`Deployment for exchangeId ${exchangeId} not found`);
    }
    return deployment;
  }

  getDeploymentByBlockchainType(blockchainType: BlockchainType): Deployment {
    const deployment = this.deployments.find((d) => d.blockchainType === blockchainType);
    if (!deployment) {
      throw new Error(`Deployment not found for blockchain type: ${blockchainType}`);
    }
    return deployment;
  }

  getLowercaseTokenMap(deployment: Deployment): LowercaseTokenMap {
    if (!deployment.mapEthereumTokens) {
      return {};
    }

    return Object.entries(deployment.mapEthereumTokens).reduce((acc, [key, value]) => {
      acc[key.toLowerCase()] = value.toLowerCase();
      return acc;
    }, {});
  }
}
