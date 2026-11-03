import { FormEvent, useState } from "react";
import { ArrowRight, Check, DoorOpen, Sparkles } from "lucide-react";
import "@/auth.css";

export function AuthScreen({ busy, onSignIn, onSignUp }: { busy: boolean; onSignIn: (email: string, password: string) => Promise<void>; onSignUp: (name: string, email: string, password: string) => Promise<void> }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    try {
      if (mode === "signup") { await onSignUp(name, email, password); setSent(true); }
      else await onSignIn(email, password);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos completar la solicitud."); }
  };
  return <main className="auth-screen"><div className="auth-glow auth-glow-one"/><div className="auth-glow auth-glow-two"/><section className="auth-card"><div className="auth-brand"><span className="auth-logo"><DoorOpen size={23}/></span><span><b>renova</b><small>AI CAREER SUITE</small></span></div><div className="auth-kicker"><Sparkles size={14}/> TU PRÓXIMO CAPÍTULO COMIENZA AQUÍ</div><h1>{mode === "signin" ? <>Qué bueno<br/>tenerte <em>de vuelta.</em></> : <>Abre la puerta<br/>a tu <em>siguiente paso.</em></>}</h1><p className="auth-intro">{mode === "signin" ? "Inicia sesión para continuar con tu camino profesional." : "Crea tu espacio personal y construye tu próximo capítulo."}</p>{sent ? <div className="auth-confirm"><span><Check size={18}/></span><b>Revisa tu correo</b><p>Te enviamos un enlace para confirmar tu cuenta y entrar a Renova.</p></div> : <form onSubmit={submit}>{mode === "signup" && <label>Nombre completo<input autoComplete="name" required value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre"/></label>}<label>Correo electrónico<input autoComplete="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input autoComplete={mode === "signin" ? "current-password" : "new-password"} type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"/></label>{error && <p className="auth-error">{error}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? <span className="spinner"/> : mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}<ArrowRight size={16}/></button></form>}<div className="auth-switch">{mode === "signin" ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}<button onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSent(false); }}>{mode === "signin" ? "Crear una cuenta" : "Iniciar sesión"}</button></div><div className="auth-safe"><span>◈</span> Tus datos están protegidos con acceso privado.</div></section><div className="auth-side-copy"><span>“</span><p>Tu talento merece encontrar<br/>el lugar donde pueda florecer.</p><small>EL SIGUIENTE PASO ES TUYO</small><div className="auth-door-art"><div/></div></div></main>;
}
