import { createContext, useContext, useMemo, useState } from 'react';

import { setApiToken } from '@/lib/api';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [session, setSession] = useState(null); // { user, token }

  const value = useMemo(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    signIn: (userData) => {
      const token = userData.accessToken ?? null;
      setApiToken(token);
      setSession({ user: userData, token });
    },
    signOut: () => {
      setApiToken(null);
      setSession(null);
    },
  }), [session]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  return context;
}
