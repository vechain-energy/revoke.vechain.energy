import { AllowanceData, TransactionSubmitted } from 'lib/interfaces';
import { useTransactionStore } from 'lib/stores/transaction-store';
import { getAllowanceKey } from 'lib/utils/allowances';
import { useTranslations } from 'next-intl';
import Button from '../../common/Button';
import { CheckCircleIcon as IconSuccess } from '@heroicons/react/24/outline';

interface Props {
  allowance: AllowanceData;
  revoke: () => Promise<TransactionSubmitted>;
  disabled: boolean;
}

const RevokeButton = ({ allowance, disabled, revoke }: Props) => {
  const t = useTranslations();
  const result = useTransactionStore((state) => state.results[getAllowanceKey(allowance)]);
  const loading = result?.status === 'pending';
  const confirmed = result?.status === 'confirmed';

  if (confirmed) {
    return (
      <Button disabled style="secondary" size="sm">
        <IconSuccess className="w-5 h-5 mr-1" />
        {t('common.buttons.revoked')}
      </Button>
    );
  }

  return (
    <Button disabled={disabled} loading={loading} style="secondary" size="sm" onClick={revoke}>
      {loading ? t('common.buttons.revoking') : t('common.buttons.revoke')}
    </Button>
  );
};

export default RevokeButton;
