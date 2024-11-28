'use client';

import { Dialog } from '@headlessui/react';
import Button from 'components/common/Button';
import Logo from 'components/common/Logo';
import Modal from 'components/common/Modal';
import { useRouter } from 'lib/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useWallet, useWalletModal } from '@vechain/dapp-kit-react'

interface Props {
  text?: string;
  size: 'sm' | 'md' | 'lg' | 'none';
  style?: 'primary' | 'secondary' | 'tertiary' | 'none';
  className?: string;
  redirect?: boolean;
}

const ConnectButton = ({ size, style, className, text, redirect }: Props) => {
  const t = useTranslations();
  const router = useRouter();
  const { account } = useWallet();
  const { open: openModal } = useWalletModal();

  const handleClick = () => {
    if (account) {
      router.push(`/address/${account}${location.search}`);
    } else {
      openModal();
    }
  };

  return (
    <Button style={style ?? 'primary'} size={size ?? 'md'} className={className} onClick={handleClick}>
      {text ?? t('common.buttons.connect')}
    </Button>
  );
};

export default ConnectButton;
