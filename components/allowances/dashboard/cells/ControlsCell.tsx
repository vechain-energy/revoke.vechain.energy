import { useRevoke } from 'lib/hooks/ethereum/useRevoke';
import { useVeChainRevoke } from 'lib/hooks/vechain/useVeChainRevoke';
import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { ChainId } from '@revoke.cash/chains';
import ControlsSection from '../../controls/ControlsSection';

interface Props {
  allowance: AllowanceData;
  onUpdate: OnUpdate;
}

const ControlsCell = ({ allowance, onUpdate }: Props) => {
  const isVeChain = allowance.chainId === ChainId.VeChain || allowance.chainId === ChainId.VeChainTestnet;
  const { revoke: ethereumRevoke } = useRevoke(allowance, onUpdate);
  const { revoke: vechainRevoke } = useVeChainRevoke(allowance, onUpdate);

  const revoke = isVeChain ? vechainRevoke : ethereumRevoke;

  return (
    <div className="flex justify-end w-28 mr-0 mx-auto">
      <ControlsSection allowance={allowance} revoke={revoke} />
    </div>
  );
};

export default ControlsCell;
