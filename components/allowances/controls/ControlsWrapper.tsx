import WithHoverTooltip from 'components/common/WithHoverTooltip';
import { getChainName } from 'lib/utils/chains';
import { useTranslations } from 'next-intl';
import { ReactElement } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';

interface Props {
  chainId: number;
  address: string;
  switchChainSize?: 'sm' | 'md' | 'lg';
  children?: (disabled: boolean) => ReactElement;
  overrideDisabled?: boolean;
  disabledReason?: string;
}

const ControlsWrapper = ({ chainId, address, switchChainSize, children, overrideDisabled, disabledReason }: Props) => {
  const t = useTranslations();
  const { account } = useWallet();

  const chainName = getChainName(chainId);

  const isConnected = !!account;
  const isConnectedAddress = isConnected && address === account;
  // VeChain is always on the right chain since it's the only one
  const needsToSwitchChain = false;
  const disabled = !isConnectedAddress || overrideDisabled;

  if (!isConnected) {
    return <WithHoverTooltip tooltip={t('address.tooltips.connect_wallet')}>{children(disabled)}</WithHoverTooltip>;
  }

  if (!isConnectedAddress) {
    return <WithHoverTooltip tooltip={t('address.tooltips.connected_account')}>{children(disabled)}</WithHoverTooltip>;
  }

  if (overrideDisabled && disabledReason) {
    return <WithHoverTooltip tooltip={disabledReason}>{children(disabled)}</WithHoverTooltip>;
  }

  return <>{children(false)}</>;
};

export default ControlsWrapper;
