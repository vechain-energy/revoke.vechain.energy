import { AllowanceData, OnUpdate } from 'lib/interfaces';
import { useVeChainRevoke } from 'lib/hooks/vechain/useVeChainRevoke';
import ControlsSection from 'components/allowances/controls/ControlsSection';

interface Props {
  allowance: AllowanceData;
  onUpdate: OnUpdate;
}

const ControlsCell = ({ allowance, onUpdate }: Props) => {
  const { revoke } = useVeChainRevoke(allowance, onUpdate);

  const handleRevoke = async () => {
    const result = await revoke();
    return {
      hash: `0x${result.hash}` as `0x${string}`,
      wait: async () => {
        const confirmation = await result.confirmation;
        return {
          transactionHash: `0x${confirmation.transactionHash}` as `0x${string}`,
        };
      },
    };
  };

  return (
    <div className="flex justify-end w-28 mr-0 mx-auto">
      {/* @ts-ignore - Type mismatch between VeChain and Ethereum transaction types */}
      <ControlsSection allowance={allowance} revoke={handleRevoke} />
    </div>
  );
};

export default ControlsCell;
