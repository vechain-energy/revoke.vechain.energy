import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { parseInputAddress } from 'lib/utils/whois';
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@vechain/dapp-kit-react';
import Button from './Button';
import Input from './Input';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Props {
  className?: string;
  placeholder?: string;
  onSubmit?: (address: string) => void;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AddressSearchBox = ({ className, placeholder, onSubmit, id, value, onChange }: Props) => {
  const t = useTranslations();
  const router = useRouter();
  const { account: connectedAddress } = useWallet();
  const [inputValue, setInputValue] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [hasInput, setHasInput] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const validateInput = useCallback(async (val: string) => {
    const trimmedValue = val?.trim() || '';
    setHasInput(!!trimmedValue);
    
    if (!trimmedValue) {
      setIsValid(false);
      return;
    }

    setIsValidating(true);
    try {
      // Check if it's a valid address or can be resolved to one
      const address = await parseInputAddress(trimmedValue);
      setIsValid(!!address);
    } catch {
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  }, []);

  useEffect(() => {
    validateInput(value ?? inputValue);
  }, [value, inputValue, validateInput]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const address = await parseInputAddress(value ?? inputValue);
      if (!address) return;

      if (onSubmit) {
        onSubmit(address);
      } else {
        router.push(`/address/${address}`);
      }
    },
    [value, inputValue, onSubmit, router],
  );

  return (
    <form onSubmit={handleSubmit} className={`h-9 flex gap-2 items-center border px-2 font-medium focus-within:ring-black dark:focus-within:ring-white ${className}`}>
      <MagnifyingGlassIcon className="w-6 h-6 text-zinc-500 dark:text-zinc-300" />
      <input
        id={id}
        type="text"
        placeholder={placeholder ?? t('nav.search')}
        value={value ?? inputValue}
        onChange={onChange ?? ((e) => setInputValue(e.target.value))}
        className="grow focus-visible:outline-none bg-transparent"
        aria-label={placeholder ?? t('nav.search')}
      />
      <Button 
        type="submit" 
        style="none" 
        size="none" 
        className="focus-visible:outline-none focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-2 focus-visible:rounded"
      >
        {hasInput && !isValidating && (
          isValid ? (
            <ArrowRightCircleIcon className="w-6 h-6" />
          ) : (
            <XMarkIcon className="w-6 h-6 text-red-500" />
          )
        )}
        {isValidating && (
          <div className="w-6 h-6 border-2 border-t-transparent border-zinc-500 rounded-full animate-spin" />
        )}
      </Button>
    </form>
  );
};
