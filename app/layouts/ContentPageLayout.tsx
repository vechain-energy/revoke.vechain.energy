import SharedLayout from './SharedLayout';

interface Props {
  children: React.ReactNode;
  searchBarOnDisconnect?: boolean;
}

const ContentPageLayout = ({ children, searchBarOnDisconnect = true }: Props) => {
  return (
    <SharedLayout searchBarOnDisconnect={searchBarOnDisconnect} padding>
      <div className="max-w-3xl mx-auto">{children}</div>
    </SharedLayout>
  );
};

export default ContentPageLayout;
