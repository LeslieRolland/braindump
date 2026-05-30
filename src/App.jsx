import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Auth from "./Auth";
import BrainDump from "./braindump_final";

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  if (user === undefined) return null;
  if (!user) return <Auth onAuth={() => {}} />;
  return <BrainDump user={user} />;
}
