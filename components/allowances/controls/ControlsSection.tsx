import RevokeButton from 'components/allowances/controls/RevokeButton';
import { AllowanceData, TransactionSubmitted } from 'lib/interfaces';
import { getAllowanceI18nValues } from 'lib/utils/allowances';
import ControlsWrapper from './ControlsWrapper';

interface Props {
  allowance: AllowanceData;
  update?: (newAmount?: string) => Promise<TransactionSubmitted>;
  reset?: () => void;
  revoke?: () => Promise<TransactionSubmitted>;
}

const ControlsSection = ({ allowance, revoke, update, reset }: Props) => {
  if (!allowance.spender) return null;

  const { amount } = getAllowanceI18nValues(allowance);

  return (
    <ControlsWrapper chainId={allowance.chainId} address={allowance.owner} switchChainSize="sm">
      {(disabled) => (
        <div className="controls-section">
          {revoke && <RevokeButton allowance={allowance} revoke={revoke} disabled={disabled} />}
        </div>
      )}
    </ControlsWrapper>
  );
};

export default ControlsSection;
