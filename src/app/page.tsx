import type { Metadata } from "next";
import LandingRedesign from "./landing-redesign";

const title = "Sistema de Gestão para Barbearias | HeadBarber";
const description =
  "Organize agendamentos, barbeiros, clientes, serviços e financeiro em um só lugar. Conheça o HeadBarber e experimente a demonstração.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "HeadBarber",
    url: "/",
    title,
    description,
    images: [{ url: "/brand/favicons/favicon-512x512.png", width: 512, height: 512, alt: "HeadBarber" }],
  },
  twitter: {
    card: "summary",
    title,
    description,
    images: ["/brand/favicons/favicon-512x512.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://headbarber.com.br/#organization",
      name: "HeadBarber",
      url: "https://headbarber.com.br/",
      logo: "https://headbarber.com.br/brand/favicons/favicon-512x512.png",
    },
    {
      "@type": "WebApplication",
      "@id": "https://headbarber.com.br/#software",
      name: "HeadBarber",
      url: "https://headbarber.com.br/",
      description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      inLanguage: "pt-BR",
      publisher: { "@id": "https://headbarber.com.br/#organization" },
      featureList: ["Agendamento online", "Gestão de clientes", "Gestão da equipe", "Financeiro e comissões", "Assinaturas de clientes", "Produtos e vendas"],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <LandingRedesign />
    </>
  );
}
