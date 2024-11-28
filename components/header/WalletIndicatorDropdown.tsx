'use client';

import DropdownMenu, { DropdownMenuItem } from 'components/common/DropdownMenu';
import { shortenAddress } from 'lib/utils/formatting';
import { useTranslations } from 'next-intl';
import { useWallet, useVechainDomain } from '@vechain/dapp-kit-react';
import ConnectButton from './ConnectButton';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'none';
  style?: 'primary' | 'secondary' | 'tertiary' | 'none';
  className?: string;
}

const WalletIndicatorDropdown = ({ size, style, className }: Props) => {
  const t = useTranslations();
  const { account, disconnect } = useWallet();
  const { domain } = useVechainDomain({ addressOrDomain: account ?? '' });

  const displayText = domain ?? (account ? shortenAddress(account, 4) : '');

  return (
    <div className="flex whitespace-nowrap">
      {account ? (
        <DropdownMenu menuButton={displayText}>
          <DropdownMenuItem href={`/address/${account}${location.search}`} router>
            {t('common.buttons.my_allowances')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()}>{t('common.buttons.disconnect')}</DropdownMenuItem>
        </DropdownMenu>
      ) : (
        <ConnectButton size={size} style={style} className={className} redirect />
      )}
    </div>
  );
};

export default WalletIndicatorDropdown;
