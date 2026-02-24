'use client';

import { useUserContext } from '@/components/providers/user-provider';

export function useUser() {
  const { user } = useUserContext();
  
  return {
    data: user,
    isLoading: false,
  };
}
