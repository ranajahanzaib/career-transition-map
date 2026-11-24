import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Career Transition Map — The invisible connections between careers",
  description:
    "Explore occupational mobility, skills and employment outlook through a transparent labor-market research platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
