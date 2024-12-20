import WithHoverTooltip from 'components/common/WithHoverTooltip';
import type { AllowanceData, OnUpdate } from 'lib/interfaces';
import { getAllowanceI18nValues } from 'lib/utils/allowances';
import { SECOND } from 'lib/utils/time';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import * as timeago from 'timeago.js';
import ControlsSection from '../../controls/ControlsSection';

interface Props {
  allowance: AllowanceData;
  onUpdate: OnUpdate;
}

const AllowanceCell = ({ allowance, onUpdate }: Props) => {
  const t = useTranslations();
  const locale = useLocale();
  const [editing, setEditing] = useState<boolean>();
  const { i18nKey, amount, tokenId, symbol } = getAllowanceI18nValues(allowance);


  const classes = twMerge(
    !allowance.spender && 'text-zinc-500 dark:text-zinc-400',
    'flex items-center gap-2',
    ['ru', 'es'].includes(locale) ? 'w-48' : 'w-40',
  );

  if (editing) {
    return (
      <div className={classes}>
        <ControlsSection allowance={allowance} reset={() => setEditing(false)} />
      </div>
    );
  }

  const inTime = allowance.expiration > 0 ? timeago.format(allowance.expiration * SECOND, locale) : null;

  return (
    <div className={classes}>
      <div className="flex flex-col justify-start items-start truncate">
        <div className="w-full truncate">{t(i18nKey, { amount, tokenId, symbol })}</div>
        {inTime ? (
          <WithHoverTooltip tooltip={t('address.tooltips.permit2_expiration', { inTime })}>
            <div className="flex items-center gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {t('address.permit2.expiration', { inTime })}
            </div>
          </WithHoverTooltip>
        ) : null}
      </div>
    </div>
  );
};

export default AllowanceCell;
