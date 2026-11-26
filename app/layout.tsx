import "./globals.css";

export const metadata = { title: "In This House" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@800&family=Lato:wght@300&family=Open+Sans:wght@400&family=Roboto+Condensed:wght@400&display=swap"
        />
      </head>
      <body className="bg-[#1b1a1a] text-[#F2F2F2]">{children}</body>
    </html>
  );
}
