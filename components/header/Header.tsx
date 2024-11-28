import WalletIndicator from 'components/header/WalletIndicator';
import { useTranslations } from 'next-intl';
import HeaderLogo from './HeaderLogo';
import MobileMenu from './MobileMenu';

const Header = () => {
  const t = useTranslations();

  return (
    <header className="flex justify-between items-center gap-8 w-full p-4 lg:px-8 pb-8 relative">
      <div className="flex shrink-0 h-9">
        <HeaderLogo />
      </div>
      <div className="flex grow justify-end items-center gap-2 shrink-0">
        <div className="hidden lg:flex justify-end gap-2 min-w-[15rem]">
          <WalletIndicator />
        </div>
        <div className="flex lg:hidden justify-end">
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
