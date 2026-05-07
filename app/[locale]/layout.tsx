import { NextIntlClientProvider } from 'next-intl';
import esMessages from '@/messages/es.json';
import caMessages from '@/messages/ca.json';

interface Params {
  locale: string;
}

export default function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const messages = locale === 'ca' ? caMessages : esMessages;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
