import { Helmet } from "react-helmet-async";

const PROD_ORIGIN = "https://appgramavel.vercel.app";

interface SeoProps {
  title: string;
  description: string;
  /** Absolute path, e.g. "/map" or "/estabelecimento/mini-mundo". Defaults to "/". */
  path?: string;
  /** Absolute URL or path of the Open Graph image. */
  image?: string;
}

/**
 * Per-route SEO tags (title, description, canonical, Open Graph).
 * Canonical always points to the production domain.
 */
export function Seo({ title, description, path = "/", image }: SeoProps) {
  const canonical = `${PROD_ORIGIN}${path}`;
  const ogImage = image
    ? image.startsWith("http")
      ? image
      : `${PROD_ORIGIN}${image}`
    : `${PROD_ORIGIN}/og-image.png`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
