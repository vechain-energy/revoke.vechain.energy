'use client';

import { useMounted } from 'lib/hooks/useMounted';
import { useWallet } from '@vechain/dapp-kit-react';
import WalletIndicatorDropdown from './WalletIndicatorDropdown';

interface Props {
  menuAlign?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg' | 'none';
  style?: 'primary' | 'secondary' | 'tertiary' | 'none';
  className?: string;
}

const WalletIndicator = ({ menuAlign, size, style, className }: Props) => {
  const isMounted = useMounted();
  const { account } = useWallet();

  if (!isMounted) return null;

  return (
    <div className="flex gap-2">
      <WalletIndicatorDropdown size={size} style={style} className={className} />
    </div>
  );
};

export default WalletIndicator;
