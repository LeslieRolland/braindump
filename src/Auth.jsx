import { useState } from "react";
import { auth } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const T = {
  paper: "#FFFDF5", paperCard: "#F5EDD6", paperHover: "#EDE4C8",
  border: "rgba(139,105,20,0.15)", borderStrong: "rgba(139,105,20,0.30)",
  ink: "#2C2412", inkMuted: "#6B5830", inkFaint: "#A08C5A",
  amber: "#C8891A", amberDark: "#8B6914",
  gradBtn: "linear-gradient(135deg,#C8891A,#E8A838)",
  urgent: "#B85C4A", urgentBg: "#F0E0DA", urgentText: "#7A3528",
};

export default function Auth({ onAuth }) {
  const [mode, setMode]       = useState("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      onAuth();
    } catch (err) {
      const messages = {
        "auth/user-not-found":    "Aucun compte avec cet email.",
        "auth/wrong-password":    "Mot de passe incorrect.",
        "auth/email-already-in-use": "Un compte existe déjà avec cet email.",
        "auth/weak-password":     "Le mot de passe doit faire au moins 6 caractères.",
        "auth/invalid-email":     "Email invalide.",
        "auth/invalid-credential": "Email ou mot de passe incorrect.",
      };
      setError(messages[err.code] || "Une erreur est survenue.");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", background:T.paper, display:"flex", alignItems:"center", justifyContent:"center", padding:"20px" }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:40, justifyContent:"center" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.amberDark} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
            <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
          </svg>
          <span style={{ fontWeight:600, fontSize:18, letterSpacing:"-0.02em", color:T.ink }}>BrainDump</span>
        </div>

        <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.02em", marginBottom:24, color:T.ink }}>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </div>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input
            type="email" value={email} onChange={e=>setEmail(e.target.value)}
            placeholder="Email" required autoFocus
            style={{ padding:"11px 14px", borderRadius:12, border:`1px solid ${T.borderStrong}`, background:T.paperCard, fontSize:14, color:T.ink, fontFamily:"inherit" }}
          />
          <input
            type="password" value={password} onChange={e=>setPassword(e.target.value)}
            placeholder="Mot de passe" required
            style={{ padding:"11px 14px", borderRadius:12, border:`1px solid ${T.borderStrong}`, background:T.paperCard, fontSize:14, color:T.ink, fontFamily:"inherit" }}
          />

          {error && (
            <div style={{ padding:"10px 14px", borderRadius:10, background:T.urgentBg, color:T.urgentText, fontSize:13 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ marginTop:4, padding:"12px", borderRadius:12, fontSize:14, fontWeight:600, background:T.gradBtn, color:"white", border:"none", cursor:"pointer" }}>
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer le compte"}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:"center", fontSize:13, color:T.inkMuted }}>
          {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
          <button onClick={()=>{setMode(mode==="login"?"register":"login");setError("");}}
            style={{ color:T.amberDark, fontWeight:500, textDecoration:"underline", background:"none", border:"none", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
            {mode === "login" ? "S'inscrire" : "Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
