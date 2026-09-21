import { createContext, useContext, useMemo, useState } from 'react';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const value = useMemo(() => ({ user, signIn: setUser, signOut: () => setUser(null) }), [user]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  return context;
}
