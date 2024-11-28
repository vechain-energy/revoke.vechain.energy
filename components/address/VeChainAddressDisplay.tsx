import CopyButton from 'components/common/CopyButton';
import WithHoverTooltip from 'components/common/WithHoverTooltip';
import { shortenAddress } from 'lib/utils/formatting';
import { twMerge } from 'tailwind-merge';
import { useVechainDomain } from '@vechain/dapp-kit-react';

interface Props {
  addressOrDomain: string;
  className?: string;
  withCopyButton?: boolean;
  withTooltip?: boolean;
}

const VeChainAddressDisplay = ({ addressOrDomain, className, withCopyButton, withTooltip }: Props) => {
  const { isLoading, address, domain } = useVechainDomain({ addressOrDomain });
  const classes = twMerge('flex gap-1 items-center', className, 'leading-none');

  // If loading, show a shortened version of the input
  if (isLoading) {
    return (
      <div className={classes}>
        {shortenAddress(addressOrDomain, 6)}
        {withCopyButton && <CopyButton content={addressOrDomain} />}
      </div>
    );
  }

  // Once loaded, show domain if available, otherwise show shortened address
  return (
    <div className={classes}>
      {withTooltip ? (
        <WithHoverTooltip tooltip={address}>
          <span>{domain ?? shortenAddress(address, 6)}</span>
        </WithHoverTooltip>
      ) : (
        (domain ?? shortenAddress(address, 6))
      )}
      {withCopyButton && <CopyButton content={address} />}
    </div>
  );
};

export default VeChainAddressDisplay; 