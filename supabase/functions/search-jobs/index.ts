const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/\s+/g, " ").trim();
const normalize = (value: string) => value.replace(/\b(vacantes?|empleos?|puestos?|trabajos?|ofertas?|busca|buscar|encuentra|quiero|encontrar|en|de|del|para|at|jobs?|careers?)\b/gi, " ").replace(/[;,]+/g, " ").replace(/\s+/g, " ").trim();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  try {
    const body = await request.json();
    const rawKeywords = typeof body.keywords === "string" ? body.keywords.slice(0, 160).trim() : typeof body.query === "string" ? body.query.slice(0, 160).trim() : "";
    const keywords = normalize(rawKeywords);
    const location = typeof body.location === "string" ? body.location.slice(0, 120).trim() : "";
    if (!keywords) return Response.json({ error: "Escribe una empresa, puesto o palabra clave." }, { status: 400, headers: corsHeaders });

    await pause(1600);
    const url = new URL("https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search");
    url.searchParams.set("keywords", keywords);
    if (location) url.searchParams.set("location", location);
    url.searchParams.set("start", "0");
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; RenovaCareerSuite/1.0)", Accept: "text/html" } });
    if (!response.ok) return Response.json({ error: "LinkedIn job listings are temporarily unavailable." }, { status: 502, headers: corsHeaders });
    const html = await response.text();
    const cards = html.match(/<li\b[\s\S]*?<\/li>/gi) ?? [];
    const unique = new Map<string, { title: string; company: string; location: string; url: string }>();
    for (const card of cards) {
      const titleMatch = card.match(/class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i);
      const companyMatch = card.match(/class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i);
      const locationMatch = card.match(/class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
      const linkMatch = card.match(/<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]+)"/i) ?? card.match(/<a[^>]*href="([^"]*linkedin\.com\/jobs\/view\/[^\"]+)"/i);
      if (!titleMatch || !companyMatch || !linkMatch) continue;
      const title = clean(titleMatch[1]);
      const company = clean(companyMatch[1]);
      const jobUrl = linkMatch[1].split("?")[0];
      const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
      if (title && company && !unique.has(key)) unique.set(key, { title, company, location: locationMatch ? clean(locationMatch[1]) : location, url: jobUrl });
    }
    const result = Array.from(unique.values()).map((job) => ({ ...job, match: null }));
    return Response.json({ jobs: result, source: "LinkedIn Guest API", query: keywords }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Could not retrieve job listings." }, { status: 500, headers: corsHeaders });
  }
});
