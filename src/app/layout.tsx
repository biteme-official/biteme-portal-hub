import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { MobileSidebarProvider } from "@/contexts/MobileSidebarContext";

export const metadata: Metadata = {
  title: "BiteMe 포털 허브",
  description: "바잇미 전사 대시보드 & 업무 툴 통합 포털",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="h-full flex flex-col">
        <AuthProvider>
          <MobileSidebarProvider>
            <Header />
            <div className="flex flex-1 overflow-hidden">
              <Sidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </MobileSidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
