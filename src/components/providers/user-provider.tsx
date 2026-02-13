'use client';

import { createContext, useContext, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  companies?: any;
}

interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType>({ user: null });

export function UserProvider({ 
  children, 
  user 
}: { 
  children: ReactNode; 
  user: User | null;
}) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserContext() {
  return useContext(UserContext);
}
