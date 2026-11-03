import { useRef, useState } from "react";
import { ArrowRight, Check, FileText, LogOut, Sparkles, Target, Upload, X } from "lucide-react";
import "@/cv-focus.css";
import { AuthScreen } from "@/components/AuthScreen";
import { useRenovaSupabase } from "@/hooks/useRenovaSupabase";

type Analysis = { matchScore: number; keywordsPresent: string[]; keywordsMissing: string[]; optimizedBullets: Array<{ before: string; after: string }> };

export default function Index() {
  const remote = useRenovaSupabase();
  const fileInput = useRef<HTMLInputElement>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const analyze = async () => {
    if (!jobDescription.trim() || (!resumeText.trim() && !resumeFile)) {
      setNotice("Añade tu CV y la descripción de la vacante para comenzar.");
      return;
    }
    if (resumeFile && resumeFile.size > 4 * 1024 * 1024) {
      setNotice("El archivo debe pesar menos de 4 MB.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      let base64 = "";
      if (resumeFile?.type === "application/pdf") {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(resumeFile);
        });
        base64 = dataUrl.split(",")[1];
      } else if (resumeFile?.type === "text/plain") {
        setResumeText(await resumeFile.text());
      }
      const result = await remote.analyzeCv(resumeText, jobDescription, base64, resumeFile?.type);
      setAnalysis(result);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo analizar el CV.");
    } finally {
      setBusy(false);
    }
  };

  if (remote.loading) return <div className="auth-loading"><span className="spinner"/> Cargando Renova…</div>;
  if (!remote.user) return <AuthScreen busy={remote.authBusy} onSignIn={remote.signIn} onSignUp={remote.signUp}/>;
  const displayName = remote.profile?.display_name || remote.user.user_metadata.display_name || remote.user.email?.split("@")[0] || "Tu perfil";

  return <div className="renova-app">
    <aside className="sidebar">
      <div className="brand"><svg viewBox="0 0 48 48" className="brand-mark" aria-hidden="true"><path d="M8 42V21a16 16 0 0 1 32 0v21M15 42V23a9 9 0 0 1 18 0v19M24 7v8m-8-5 5 6m11-6-5 6M24 25v17M4 42h40"/></svg><span><b>renova</b><small>AI CV STUDIO</small></span></div>
      <div className="side-label">TU ESPACIO</div>
      <nav><div className="nav-link active"><FileText size={18}/><span>Análisis inteligente de CV</span></div></nav>
      <div className="side-bottom"><div className="profile-mini"><div className="avatar">{displayName.slice(0, 1).toUpperCase()}</div><div className="profile-text"><b>{displayName}</b><span>Tu próximo capítulo empieza aquí</span></div><button className="icon-button" onClick={() => void remote.signOut()} aria-label="Cerrar sesión"><LogOut size={16}/></button></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Renova <span>/</span> <b>Análisis de CV</b></div><span className="analysis-status">ANÁLISIS PRIVADO</span></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot"/> TU COPILOTO DE CARRERA</div><h1>Haz que tu experiencia destaque.</h1><p>Compara tu CV con una vacante y recibe recomendaciones inteligentes para acercarte a tu próximo rol.</p></div></div>
        <section className="welcome-card cv-hero"><div className="welcome-copy"><span className="welcome-pill"><Sparkles size={13}/> POTENCIADO POR IA</span><h2>Tu historia,<br/>enfocada en <em>lo que buscan.</em></h2><p>Un análisis personalizado de compatibilidad, palabras clave y mejoras concretas para tu CV.</p></div><div className="cv-hero-art"><div className="cv-hero-icon"><FileText size={50}/><Sparkles size={20}/></div><span className="hero-orbit orbit-one"/><span className="hero-orbit orbit-two"/></div></section>
        <div className="section-row"><div><h2 className="section-title">Prepara tu análisis</h2><p className="section-sub">Comparte tu CV y la descripción del puesto que te interesa.</p></div><span className="step-count">DOS PASOS · UN PLAN MÁS CLARO</span></div>
        <div className="matcher-grid">
          <section className="glass-card matcher-form">
            <div className="card-heading"><div><span className="tiny-icon mint"><FileText size={15}/></span><h3>Tu CV y la vacante</h3></div><span className="step-count">01 / 02</span></div>
            <button className={`upload-zone ${fileName ? "uploaded" : ""}`} onClick={() => fileInput.current?.click()}><span className="upload-icon"><Upload size={21}/></span><b>{fileName || "Sube tu CV"}</b><small>{fileName ? "Archivo listo · Haz clic para cambiar" : "PDF o TXT · máximo 4 MB"}</small><input ref={fileInput} hidden type="file" accept="application/pdf,.pdf,text/plain,.txt" onChange={event => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); setResumeFile(file); if (file.type === "text/plain") file.text().then(setResumeText); } }}/></button>
            <label className="field-label">O PEGA EL CONTENIDO DE TU CV <span>puedes combinarlo con un PDF</span></label>
            <textarea className="form-textarea cv-input" placeholder="Pega aquí tu experiencia, educación y habilidades…" value={resumeText} onChange={event => setResumeText(event.target.value)}/>
            <label className="field-label">DESCRIPCIÓN DE LA VACANTE <span>requerido</span></label>
            <textarea className="form-textarea job-description-input" placeholder="Pega aquí la descripción completa del puesto al que quieres aplicar…" value={jobDescription} onChange={event => setJobDescription(event.target.value)}/>
            <button className="primary-button full-button" onClick={analyze} disabled={busy}>{busy ? <><span className="spinner"/> Analizando tu perfil…</> : <><Sparkles size={16}/> Analizar mi CV <ArrowRight size={16}/></>}</button>
            <p className="privacy-note"><span>◈</span> Tu análisis se procesa de forma privada y se guarda en tu cuenta.</p>
          </section>
          <section className="glass-card analysis-card"><div className="card-heading"><div><span className="tiny-icon lavender"><Target size={15}/></span><h3>Tu análisis inteligente</h3></div><span className="analysis-status">{analysis ? "ACTUALIZADO" : "LISTO CUANDO TÚ LO ESTÉS"}</span></div>
            {analysis ? <><div className="score-area"><div className="score-ring" style={{ "--score": `${analysis.matchScore * 3.6}deg` } as React.CSSProperties}><div><b>{analysis.matchScore}</b><span>%</span></div></div><div><b className="score-caption">Compatibilidad con la vacante</b><p>Tu perfil coincide en {analysis.matchScore}% con los requisitos del puesto.</p><span className="score-delta">Análisis personalizado por IA</span></div></div><div className="keyword-columns"><div><b className="keyword-heading found"><Check size={14}/> Fortalezas detectadas <span>{analysis.keywordsPresent.length}</span></b><div className="keyword-pills">{(analysis.keywordsPresent.length ? analysis.keywordsPresent : ["Sin coincidencias detectadas"]).map(keyword => <i key={keyword}>{keyword}</i>)}</div></div><div><b className="keyword-heading missing"><Target size={14}/> Para reforzar <span>{analysis.keywordsMissing.length}</span></b><div className="keyword-pills missing-pills">{(analysis.keywordsMissing.length ? analysis.keywordsMissing : ["¡Todo cubierto!"]).map(keyword => <i key={keyword}>{keyword}</i>)}</div></div></div>{analysis.optimizedBullets.length > 0 && <div className="bullet-comparisons"><h4>Mejora tus viñetas</h4>{analysis.optimizedBullets.map((bullet, index) => <div className="bullet-pair" key={index}><p><b>Tu versión</b>{bullet.before}</p><p><b>Versión sugerida</b>{bullet.after}</p></div>)}</div>}<div className="rewrite-box"><b>Tu siguiente oportunidad <Sparkles size={13}/></b><p>Usa las palabras clave relevantes con ejemplos reales de tu experiencia. La IA no inventa logros ni habilidades por ti.</p></div></> : <div className="analysis-empty"><div className="empty-orbit"><Sparkles size={26}/></div><h4>Tu próximo insight te espera</h4><p>Al comparar tu CV con la vacante, recibirás un análisis útil y accionable.</p><div className="empty-step"><span>1</span> Sube tu CV o pega su contenido</div><div className="empty-step"><span>2</span> Pega la descripción del puesto</div><div className="empty-step"><span>3</span> Descubre cómo destacar</div></div>}
          </section>
        </div>
        <footer className="page-footer"><span>© 2025 Renova · Tu copiloto de carrera</span><span><Sparkles size={14}/> Análisis inteligente, enfoque humano</span></footer>
      </div>
    </main>
    {notice && <div className="toast-message"><X size={16}/>{notice}<button onClick={() => setNotice("")} aria-label="Cerrar aviso"><X size={14}/></button></div>}
  </div>;
}
