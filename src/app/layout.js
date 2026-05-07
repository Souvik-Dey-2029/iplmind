import "./globals.css";

export const metadata = {
  title: "IPLMind",
  description: "An IPL player guessing game powered by strategic questions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
