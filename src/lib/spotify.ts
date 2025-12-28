import { supabase } from "@/integrations/supabase/client";

export interface SpotifyUser {
  id: string;
  display_name: string | null;
  email: string;
  images: { url: string }[];
  country: string;
  product: string;
}

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: { url: string }[];
  tracks_total: number;
  public: boolean;
  owner: { id: string; display_name: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: string;
  album: string;
  added_at: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: string;
  images: { url: string }[];
  added_at: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres: string[];
}

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  images: { url: string }[];
  added_at: string;
}

export interface SpotifyUserData {
  playlists: SpotifyPlaylist[];
  savedTracks: SpotifyTrack[];
  savedAlbums: SpotifyAlbum[];
  followedArtists: SpotifyArtist[];
  savedShows: SpotifyShow[];
}

export interface TransferOptions {
  playlists: boolean;
  tracks: boolean;
  albums: boolean;
  artists: boolean;
  podcasts: boolean;
  playlistIds?: string[];
  trackIds?: string[];
  albumIds?: string[];
  artistIds?: string[];
  showIds?: string[];
}

export interface TransferResult {
  success: { type: string; count?: number; name?: string; tracks?: number }[];
  failed: { type: string; error: string; id?: string }[];
}

// Check if using self-hosted backend (Node.js/Express)
// Set VITE_BACKEND_URL in .env to use self-hosted backend
// Example: VITE_BACKEND_URL=https://api.yourdomain.com
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const useSelfHosted = !!BACKEND_URL;

const getRedirectUri = () => {
  return `${window.location.origin}/callback`;
};

// Helper for self-hosted API calls
async function callSelfHostedApi(endpoint: string, body: any) {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error || 'Request failed');
  }
  
  return response.json();
}

export async function getSpotifyAuthUrl(accountType: 'source' | 'target'): Promise<string> {
  const body = {
    action: 'get_auth_url',
    redirect_uri: getRedirectUri(),
    account_type: accountType,
  };

  if (useSelfHosted) {
    const data = await callSelfHostedApi('/api/spotify-auth', body);
    return data.auth_url;
  }

  const { data, error } = await supabase.functions.invoke('spotify-auth', { body });
  if (error) throw new Error(error.message);
  return data.auth_url;
}

export async function exchangeSpotifyToken(code: string): Promise<{ tokens: SpotifyTokens; user: SpotifyUser }> {
  const body = {
    action: 'exchange_token',
    code,
    redirect_uri: getRedirectUri(),
  };

  let data;
  if (useSelfHosted) {
    data = await callSelfHostedApi('/api/spotify-auth', body);
  } else {
    const result = await supabase.functions.invoke('spotify-auth', { body });
    if (result.error) throw new Error(result.error.message);
    data = result.data;
  }

  if (data.error) throw new Error(data.error);
  
  return {
    tokens: {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    },
    user: data.user,
  };
}

export async function getSpotifyUserData(accessToken: string): Promise<SpotifyUserData> {
  const body = {
    action: 'get_user_data',
    access_token: accessToken,
  };

  let data;
  if (useSelfHosted) {
    data = await callSelfHostedApi('/api/spotify-data', body);
  } else {
    const result = await supabase.functions.invoke('spotify-data', { body });
    if (result.error) throw new Error(result.error.message);
    data = result.data;
  }

  if (data.error) throw new Error(data.error);
  return data;
}

export async function transferSpotifyData(
  sourceToken: string,
  targetToken: string,
  options: TransferOptions
): Promise<TransferResult> {
  const body = {
    action: 'transfer_data',
    data: {
      source_token: sourceToken,
      target_token: targetToken,
      transfer_options: options,
    },
  };

  let data;
  if (useSelfHosted) {
    data = await callSelfHostedApi('/api/spotify-data', body);
  } else {
    const result = await supabase.functions.invoke('spotify-data', { body });
    if (result.error) throw new Error(result.error.message);
    data = result.data;
  }

  if (data.error) throw new Error(data.error);
  return data;
}
