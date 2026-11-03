const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value: string) => value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, " ").replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/\s+/g, " ").trim();
const normalize = (value: string) => value.replace(/\b(vacantes?|empleos?|puestos?|trabajos?|ofertas?|busca|buscar|encuentra|quiero|encontrar|en|de|del|para|at|jobs?|careers?)\b/gi, " ").replace(/[;,]+/g, " ").replace(/\s+/g, " ").trim();
const classText = (html: string, className: string) => {
  const match = html.match(new RegExp(`<([a-z][\\w:-]*)\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/\\1>`, "i"));
  return match ? clean(match[2]) : "";
};

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
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36", Accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) return Response.json({ error: "LinkedIn job listings are temporarily unavailable." }, { status: 502, headers: corsHeaders });
    const html = await response.text();
    const cards = html.match(/<li\b[\s\S]*?<\/li>/gi) ?? [];
    const unique = new Map<string, { title: string; company: string; location: string; url: string }>();
    for (const card of cards) {
      const title = classText(card, "base-search-card__title");
      const company = classText(card, "base-search-card__subtitle");
      const jobLocation = classText(card, "job-search-card__location") || location;
      const linkMatch = card.match(/<a\b(?=[^>]*class="[^"]*base-card__full-link)[^>]*href="([^"]+)"/i) ?? card.match(/<a\b[^>]*href="([^"]*linkedin\.com\/jobs\/view\/[^"]+)"/i);
      if (!title || !company || !linkMatch) continue;
      const jobUrl = linkMatch[1].split("?")[0];
      const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
      if (!unique.has(key)) unique.set(key, { title, company, location: jobLocation, url: jobUrl });
    }
    const jobs = Array.from(unique.values()).map((job) => ({ ...job, match: null }));
    return Response.json({ jobs, source: "LinkedIn Guest API", query: keywords }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Could not retrieve job listings." }, { status: 500, headers: corsHeaders });
  }
});
