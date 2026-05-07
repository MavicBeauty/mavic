import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "MAVIC Beauty & Nails | Estética, Belleza y Mucho Más",
  description: "Salón de estética profesional especializado en manicura, pedicura, depilación y tratamientos láser.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <body className={`${poppins.variable} font-poppins bg-white text-mavic-black`}>
        {children}
      </body>
    </html>
  );
}
