import { useQuery } from '@tanstack/react-query';
import CopyButton from 'components/common/CopyButton';
import Href from 'components/common/Href';
import Loader from 'components/common/Loader';
import WithHoverTooltip from 'components/common/WithHoverTooltip';
import type { AllowanceData } from 'lib/interfaces';
import { getChainExplorerUrl } from 'lib/utils/chains';
import { shortenAddress, shortenString } from 'lib/utils/formatting';
import { useVechainDomain } from '@vechain/dapp-kit-react';

interface Props {
  allowance: AllowanceData;
}

const SpenderCell = ({ allowance }: Props) => {
  const { domain, isLoading } = useVechainDomain({ addressOrDomain: allowance.spender ?? '' });

  const explorerUrl = `${getChainExplorerUrl(allowance.chainId)}/account/${allowance.spender}`;

  if (!allowance.spender) {
    return null;
  }

  return (
    <Loader isLoading={isLoading}>
      <div className="flex items-center gap-2 w-64">
        <div className="flex flex-col justify-start items-start">
          <WithHoverTooltip tooltip={allowance.spender}>
            <Href href={explorerUrl} underline="hover" external>
              <div className="max-w-[14rem] truncate">{domain ? shortenString(domain, 26) : shortenAddress(allowance.spender, 6)}</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {domain ? shortenAddress(allowance.spender, 6) : null}
              </div>
            </Href>
          </WithHoverTooltip>
        </div>
        <CopyButton content={allowance.spender} className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
      </div>
    </Loader>
  );
};

export default SpenderCell;
