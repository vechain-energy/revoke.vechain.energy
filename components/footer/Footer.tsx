import Href from 'components/common/Href';
import ColorThemeSelect from 'components/footer/ColorThemeSelect';
import { ReactNode } from 'react';
import LanguageSelect from './LanguageSelect';

const Footer = () => {
  return (
    <footer className="bg-black dark:bg-zinc-900 mt-24" aria-labelledby="footer-heading">
      <h2 id="footer-heading" className="sr-only">
        Footer
      </h2>

      <div className="mx-auto max-w-7xl px-8">
        <div className="my-16 flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="flex flex-col">
            <p className="leading-5 text-zinc-100 dark:text-zinc-100">&copy; revoke.vechain.energy</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500 pl-4">forked from revoke.cash</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <LanguageSelect />
            <ColorThemeSelect />
          </div>
        </div>
      </div>
    </footer>
  );
};

interface FooterSectionProps {
  heading: string;
  children: ReactNode;
}

const FooterSection = ({ heading, children }: FooterSectionProps) => {
  return (
    <div className="mt-8 flex flex-col gap-4">
      <h3 className="text-sm font-semibold leading-6 text-zinc-100">{heading}</h3>
      <ul role="list" className="space-y-2">
        {children}
      </ul>
    </div>
  );
};

interface FooterLinkProps {
  href: string;
  children: ReactNode;
  router?: boolean;
  external?: boolean;
}

const FooterLink = ({ href, children, router, external }: FooterLinkProps) => {
  return (
    <li key={href} className="list-none">
      <Href
        href={href}
        underline="hover"
        className="text-sm text-zinc-400 dark:text-zinc-400 visited:text-zinc-400"
        router={router}
        external={external}
      >
        {children}
      </Href>
    </li>
  );
};

export default Footer;
