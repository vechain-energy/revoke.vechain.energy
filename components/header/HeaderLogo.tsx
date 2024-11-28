import Href from 'components/common/Href';
import Image from 'next/image';

const HeaderLogo = () => {
  return (
    <Href href="/" underline="none" className="flex" router>
      <Image
        src="/assets/images/favicon.svg"
        alt="vechain.energy"
        height="30"
        width="130"
        className="block dark:hidden shrink-0"
        priority
        fetchPriority="high"
      />
      <Image
        src="/assets/images/favicon-dark.svg"
        alt="vechain.energy"
        height="30"
        width="130"
        className="hidden dark:block shrink-0"
        priority
        fetchPriority="high"
      />
    </Href>
  );
};

export default HeaderLogo;
