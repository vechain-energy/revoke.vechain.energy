import Button from 'components/common/Button';
import { useAddressPageContext } from 'lib/hooks/page-context/AddressPageContext';
import { AllowanceData } from 'lib/interfaces';
import { track } from 'lib/utils/analytics';
import { useTranslations } from 'next-intl';
import ControlsWrapper from '../ControlsWrapper';

interface Props {
  selectedAllowances: AllowanceData[];
  isRevoking: boolean;
  isAllConfirmed: boolean;
  setOpen: (open: boolean) => void;
  revoke: () => Promise<void>;
}

const BatchRevokeControls = ({ selectedAllowances, isRevoking, isAllConfirmed, setOpen, revoke }: Props) => {
  const t = useTranslations();
  const { address, selectedChainId } = useAddressPageContext();

  const handleRevoke = async () => {
    track('Batch Revoked', {
      chainId: selectedChainId,
      address,
      allowances: selectedAllowances.length,
    });

    await revoke();
  };

  const getButtonText = () => {
    if (isRevoking) return t('common.buttons.revoking');
    if (isAllConfirmed) return t('common.buttons.close');
    return t('common.buttons.revoke');
  };

  const getButtonAction = () => {
    if (isAllConfirmed) return () => setOpen(false);
    return handleRevoke;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <ControlsWrapper chainId={selectedChainId} address={address}>
        {(disabled) => (
          <div>
            <Button
              style="primary"
              size="md"
              className="px-16"
              onClick={getButtonAction()}
              loading={isRevoking}
              disabled={disabled}
            >
              {getButtonText()}
            </Button>
          </div>
        )}
      </ControlsWrapper>
    </div>
  );
};

export default BatchRevokeControls;
