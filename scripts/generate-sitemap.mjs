/**
 * Gera public/sitemap.xml antes do build (script "prebuild").
 * Consulta os estabelecimentos no Supabase via REST (anon key pública)
 * e escreve as rotas fixas + /estabelecimento/<slug> de cada lugar.
 *
 * Fonte das credenciais (nesta ordem):
 *   1. variáveis de ambiente VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY
 *   2. arquivo .env na raiz
 *   3. src/integrations/supabase/client.ts (valores já versionados)
 *
 * Se nada estiver disponível ou a consulta falhar, escreve um sitemap
 * apenas com as rotas fixas — o build nunca quebra por causa disso.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const DOMAIN = "https://appgramavel.vercel.app";

const STATIC_ROUTES = ["/", "/map", "/coupons", "/privacidade"];

function loadFromEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY)\s*=\s*"?([^"\n]+)"?\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function loadFromClientTs() {
  const clientPath = join(root, "src/integrations/supabase/client.ts");
  if (!existsSync(clientPath)) return {};
  const src = readFileSync(clientPath, "utf8");
  const url = src.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
  const key = src.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_PUBLISHABLE_KEY: key,
  };
}

function resolveCredentials() {
  const fromEnv = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  };
  if (fromEnv.VITE_SUPABASE_URL && fromEnv.VITE_SUPABASE_PUBLISHABLE_KEY) return fromEnv;
  const fromFile = loadFromEnvFile();
  if (fromFile.VITE_SUPABASE_URL && fromFile.VITE_SUPABASE_PUBLISHABLE_KEY) return fromFile;
  return loadFromClientTs();
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildXml(urls) {
  const today = new Date().toISOString().split("T")[0];
  const body = urls
    .map(
      (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq || "weekly"}</changefreq>
    <priority>${u.priority || "0.7"}</priority>
  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function fetchEstablishmentSlugs(url, key) {
  const res = await fetch(`${url}/rest/v1/establishments?select=slug,updated_at&slug=not.is.null`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase respondeu HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const urls = STATIC_ROUTES.map((path) => ({
    loc: `${DOMAIN}${path}`,
    priority: path === "/" ? "1.0" : "0.8",
    changefreq: "daily",
  }));

  const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = resolveCredentials();
  if (VITE_SUPABASE_URL && VITE_SUPABASE_PUBLISHABLE_KEY) {
    try {
      const rows = await fetchEstablishmentSlugs(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY);
      for (const row of rows) {
        if (!row.slug) continue;
        urls.push({
          loc: `${DOMAIN}/estabelecimento/${row.slug}`,
          lastmod: row.updated_at ? String(row.updated_at).split("T")[0] : undefined,
          priority: "0.7",
        });
      }
      console.log(`[sitemap] ${rows.length} estabelecimentos incluídos.`);
    } catch (err) {
      console.warn(`[sitemap] Falha ao consultar estabelecimentos (${err.message}). Gerando só rotas fixas.`);
    }
  } else {
    console.warn("[sitemap] Credenciais Supabase não encontradas. Gerando só rotas fixas.");
  }

  const outPath = join(root, "public", "sitemap.xml");
  writeFileSync(outPath, buildXml(urls), "utf8");
  console.log(`[sitemap] ${urls.length} URLs escritas em public/sitemap.xml`);
}

main();
