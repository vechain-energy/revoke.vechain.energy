import Button from 'components/common/Button';
import { useAddressPageContext } from 'lib/hooks/page-context/AddressPageContext';
import { AllowanceData } from 'lib/interfaces';
import { track } from 'lib/utils/analytics';
import { useTranslations } from 'next-intl';
import ControlsWrapper from '../ControlsWrapper';
import { Switch } from '@headlessui/react';
import { useState } from 'react';

interface Props {
  selectedAllowances: AllowanceData[];
  isRevoking: boolean;
  isAllConfirmed: boolean;
  setOpen: (open: boolean) => void;
  revoke: (useMultiClause?: boolean) => Promise<void>;
}

const BatchRevokeControls = ({ selectedAllowances, isRevoking, isAllConfirmed, setOpen, revoke }: Props) => {
  const t = useTranslations();
  const { address, selectedChainId } = useAddressPageContext();
  const [useMultiClause, setUseMultiClause] = useState(true);

  const handleRevoke = async () => {
    track('Batch Revoked', {
      chainId: selectedChainId,
      address,
      allowances: selectedAllowances.length,
      mode: useMultiClause ? 'multi-clause' : 'individual',
    });

    await revoke(useMultiClause);
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Individual Transactions</span>
        <Switch
          checked={useMultiClause}
          onChange={setUseMultiClause}
          className={`${
            useMultiClause ? 'bg-orange-500' : 'bg-zinc-400'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2`}
        >
          <span
            className={`${
              useMultiClause ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Multi-Clause Transaction</span>
      </div>
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
