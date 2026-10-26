import "./globals.css";

export const metadata = {
  title: "Práctica de conversaciones",
  description: "Practica cómo entregar un desafío a tu colaborador/a y recibe feedback.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
