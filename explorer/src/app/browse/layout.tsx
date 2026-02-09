import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse | n8n Template Explorer",
  description: "Browse n8n workflow templates by tags and services. Download as JSON or ZIP.",
};

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
