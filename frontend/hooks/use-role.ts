"use client";

import { useEffect, useState } from 'react';

export function useRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Helper to safely parse JSON
    const getRoleFromStorage = () => {
      if (typeof window === 'undefined') return null;
      
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;
        
        const user = JSON.parse(userStr);
        return user.role || null;
      } catch (e) {
        console.error("Error parsing user role from storage", e);
        return null;
      }
    };

    const currentRole = getRoleFromStorage();
    setRole(currentRole);
    setLoading(false);
  }, []);

  return {
    role,
    loading,
    // Permissions Helpers
    isSudo: role === 'SUDO_ADMIN',
    // isAdmin returns true for both Regular Admins AND Sudo Admins (hierarchical)
    isAdmin: role === 'ADMIN' || role === 'SUDO_ADMIN',
    // isUser is strictly for the basic role
    isUser: role === 'USER',
  };
}