export const metadata = {
  title: "Royale Concorde Aviation Academy",
  description: "Aviation and airport career training in Bengaluru.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
