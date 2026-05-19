import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Central Farma | Painel Operacional',
  description: 'Pagamentos por vendedora, janela de rota e ciclo de corte logístico',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
