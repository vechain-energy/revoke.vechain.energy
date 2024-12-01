'use client';

import HeaderAttachedSearchBar from 'components/header/HeaderAttachedSearchBar';
import { useVeChainWallet } from 'lib/hooks/vechain/useVeChainWallet';

interface Props {
  children: React.ReactNode;
  searchBarOnDisconnect?: boolean;
  padding?: boolean;
}

// Not all pages should have the search bar attached to the header, so we extract it from the "nested" layout file
const SharedLayout = ({ children, searchBarOnDisconnect, padding }: Props) => {
  const { address } = useVeChainWallet();
  const showSearchBar = !Boolean(address) ? searchBarOnDisconnect : true;

  return (
    <>
      <HeaderAttachedSearchBar render={showSearchBar} />
      <div className={padding ? 'px-4 lg:px-8' : ''}>{children}</div>
    </>
  );
};

export default SharedLayout;
