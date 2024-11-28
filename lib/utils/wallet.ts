import { Connector } from 'wagmi';

export const WALLET_ICONS: Record<string, string> = {
  'vechain': '/assets/images/vendor/wallets/vechain.svg',
};

export const getWalletIcon = (connector: { name: string; type: string }) => {
  return WALLET_ICONS['vechain'];
};

export const getConnectorName = (connector: Connector): string => {
  return 'VeChain';
};

export const filterAndSortConnectors = (connectors: readonly Connector[]) => {
  return [];
};
