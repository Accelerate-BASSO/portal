import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Accelerate BASSO Portal",
  description:
    "A curated discovery portal for resources produced by the Accelerate BASSO Network — ontologies, publications, tools, datasets, and communities for the behavioral and social sciences.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="flex-1 pt-[60px]">
          <div
            role="note"
            className="sticky top-[60px] z-40 border-b border-amber-300 bg-amber-50 px-[5%] py-2 text-center text-sm text-amber-900"
          >
            <strong className="font-semibold">Under development.</strong>{" "}
            Resources shown here are for illustrative and testing purposes only;
            the portal is incomplete and content may contain mistakes.
          </div>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
