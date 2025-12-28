import { useState, useCallback } from 'react';
import { 
  SpotifyUser, 
  SpotifyTokens, 
  SpotifyUserData,
  getSpotifyAuthUrl,
  exchangeSpotifyToken,
  getSpotifyUserData,
} from '@/lib/spotify';

export interface SpotifyAccount {
  user: SpotifyUser | null;
  tokens: SpotifyTokens | null;
  userData: SpotifyUserData | null;
  isLoading: boolean;
  error: string | null;
}

export function useSpotifyAuth() {
  const [sourceAccount, setSourceAccount] = useState<SpotifyAccount>({
    user: null,
    tokens: null,
    userData: null,
    isLoading: false,
    error: null,
  });

  const [targetAccount, setTargetAccount] = useState<SpotifyAccount>({
    user: null,
    tokens: null,
    userData: null,
    isLoading: false,
    error: null,
  });

  const loginSource = useCallback(async () => {
    try {
      setSourceAccount((prev) => ({ ...prev, isLoading: true, error: null }));
      const authUrl = await getSpotifyAuthUrl('source');

      // Account type is encoded in the OAuth `state` already (see backend function).
      // Open OAuth in a new tab (Lovable preview can block same-tab redirects).
      const opened = window.open(authUrl, '_blank', 'noopener,noreferrer');
      if (opened) {
        opened.focus();
      } else {
        // Fallback: try same-tab navigation
        window.location.assign(authUrl);
      }

      // Prevent double-click from opening multiple tabs
      window.setTimeout(() => {
        setSourceAccount((prev) => ({ ...prev, isLoading: false }));
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to login';
      setSourceAccount((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const loginTarget = useCallback(async () => {
    try {
      setTargetAccount((prev) => ({ ...prev, isLoading: true, error: null }));
      const authUrl = await getSpotifyAuthUrl('target');

      const opened = window.open(authUrl, '_blank', 'noopener,noreferrer');
      if (opened) {
        opened.focus();
      } else {
        window.location.assign(authUrl);
      }

      window.setTimeout(() => {
        setTargetAccount((prev) => ({ ...prev, isLoading: false }));
      }, 1200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to login';
      setTargetAccount((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const handleCallback = useCallback(async (code: string) => {
    const accountType = sessionStorage.getItem('spotify_auth_type') as 'source' | 'target' | null;
    sessionStorage.removeItem('spotify_auth_type');

    if (!accountType) {
      throw new Error('Unknown account type');
    }

    const setAccount = accountType === 'source' ? setSourceAccount : setTargetAccount;
    
    try {
      setAccount(prev => ({ ...prev, isLoading: true, error: null }));
      
      const { tokens, user } = await exchangeSpotifyToken(code);
      const userData = await getSpotifyUserData(tokens.access_token);
      
      setAccount({
        user,
        tokens,
        userData,
        isLoading: false,
        error: null,
      });

      return accountType;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to authenticate';
      setAccount(prev => ({ ...prev, isLoading: false, error: message }));
      throw error;
    }
  }, []);

  const logoutSource = useCallback(() => {
    setSourceAccount({
      user: null,
      tokens: null,
      userData: null,
      isLoading: false,
      error: null,
    });
  }, []);

  const logoutTarget = useCallback(() => {
    setTargetAccount({
      user: null,
      tokens: null,
      userData: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    sourceAccount,
    targetAccount,
    loginSource,
    loginTarget,
    logoutSource,
    logoutTarget,
    handleCallback,
    setSourceAccount,
    setTargetAccount,
  };
}
