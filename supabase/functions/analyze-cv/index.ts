const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  const authorization = request.headers.get("Authorization");
  const apiKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (!authorization || !apiKey || !supabaseUrl) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  if (!geminiKey) return Response.json({ error: "GEMINI_API_KEY is not configured for this Supabase project." }, { status: 503, headers: corsHeaders });

  try {
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: apiKey, Authorization: authorization } });
    if (!userResponse.ok) return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    const user = await userResponse.json();
    const body = await request.json();
    const resumeText = typeof body.resumeText === "string" ? body.resumeText.slice(0, 30000) : "";
    const resumeFileBase64 = typeof body.resumeFileBase64 === "string" ? body.resumeFileBase64.replace(/^data:[^;]+;base64,/, "").slice(0, 12000000) : "";
    const resumeMimeType = body.resumeMimeType === "application/pdf" ? "application/pdf" : "";
    const jobDescription = typeof body.jobDescription === "string" ? body.jobDescription.slice(0, 20000) : "";
    if ((!resumeText.trim() && !resumeFileBase64) || !jobDescription.trim()) return Response.json({ error: "A CV and jobDescription are required." }, { status: 400, headers: corsHeaders });
    if (resumeFileBase64.length > 6000000) return Response.json({ error: "The PDF must be smaller than 4 MB." }, { status: 413, headers: corsHeaders });

    const prompt = `Compare the candidate resume against the job description. Return only valid JSON with shape {"matchScore": integer 0-100, "keywordsPresent": string[], "keywordsMissing": string[], "optimizedBullets": [{"before": string, "after": string}]}. Provide at most 10 keywords per list and 3 bullet rewrites. Never invent experience or achievements; improve wording only based on resume evidence.\n\nRESUME TEXT (if provided):\n${resumeText}\n\nJOB DESCRIPTION:\n${jobDescription}`;
    const geminiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": geminiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...(resumeFileBase64 && resumeMimeType ? [{ inlineData: { mimeType: resumeMimeType, data: resumeFileBase64 } }] : [])] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
    });
    if (!geminiResponse.ok) return Response.json({ error: "CV analysis provider returned an error." }, { status: 502, headers: corsHeaders });
    const gemini = await geminiResponse.json();
    const raw = gemini.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(raw);
    const matchScore = Math.max(0, Math.min(100, Math.round(Number(result.matchScore) || 0)));
    const keywordsPresent = Array.isArray(result.keywordsPresent) ? result.keywordsPresent.slice(0, 15) : [];
    const keywordsMissing = Array.isArray(result.keywordsMissing) ? result.keywordsMissing.slice(0, 15) : [];
    const optimizedBullets = Array.isArray(result.optimizedBullets) ? result.optimizedBullets.slice(0, 3) : [];

    const saveResponse = await fetch(`${supabaseUrl}/rest/v1/cv_analyses`, {
      method: "POST",
      headers: { apikey: apiKey, Authorization: authorization, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ user_id: user.id, resume_text: resumeText || "[PDF uploaded]", job_description: jobDescription, match_score: matchScore, keywords_present: keywordsPresent, keywords_missing: keywordsMissing, optimized_bullets: optimizedBullets }),
    });
    if (!saveResponse.ok) return Response.json({ error: "Could not save CV analysis." }, { status: 500, headers: corsHeaders });
    const saved = await saveResponse.json();
    return Response.json({ ...result, matchScore, keywordsPresent, keywordsMissing, optimizedBullets, id: saved[0]?.id }, { headers: corsHeaders });
  } catch {
    return Response.json({ error: "Could not analyze this CV. Check the supplied text and try again." }, { status: 500, headers: corsHeaders });
  }
});
