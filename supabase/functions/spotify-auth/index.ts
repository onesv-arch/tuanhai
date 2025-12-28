import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID')!;
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET')!;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, code, redirect_uri, refresh_token, account_type } = await req.json();
    console.log(`Spotify Auth Action: ${action} for ${account_type || 'unknown'} account`);

    if (action === 'get_auth_url') {
      // Generate Spotify OAuth URL
      const scopes = [
        'user-library-read',
        'user-library-modify',
        'playlist-read-private',
        'playlist-read-collaborative',
        'playlist-modify-public',
        'playlist-modify-private',
        'user-follow-read',
        'user-follow-modify',
        'user-read-private',
        'user-read-email',
      ].join(' ');

      const state = `${account_type}_${Date.now()}`;
      const authUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${SPOTIFY_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${state}` +
        `&show_dialog=true`;

      console.log(`Generated auth URL for ${account_type} account`);
      return new Response(JSON.stringify({ auth_url: authUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_token') {
      // Exchange authorization code for access token
      console.log('Exchanging code for token...');

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      });

      const tokenText = await tokenResponse.text();
      let tokenData: any;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        console.error('Token endpoint returned non-JSON:', tokenText.slice(0, 200));
        return new Response(
          JSON.stringify({
            error: `Spotify token endpoint returned non-JSON (status ${tokenResponse.status}). Please verify Redirect URI + Client Secret in Spotify app settings.`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!tokenResponse.ok || tokenData?.error) {
        console.error('Token exchange error:', tokenData?.error || tokenResponse.status);
        return new Response(
          JSON.stringify({
            error: tokenData?.error_description || tokenData?.error || `Token exchange failed (status ${tokenResponse.status})`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Get user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profileText = await profileResponse.text();
      let profile: any;
      try {
        profile = JSON.parse(profileText);
      } catch {
        console.error('Profile endpoint returned non-JSON:', profileText.slice(0, 200));
        // 403 with HTML usually means "user not registered in dev app"
        const hint = profileResponse.status === 403 
          ? 'Tài khoản này chưa được thêm vào danh sách test users. Vào Spotify Developer Dashboard → App → Settings → User Management và thêm email của tài khoản.'
          : `Spotify profile endpoint returned non-JSON (status ${profileResponse.status}). Try again.`;
        return new Response(
          JSON.stringify({ error: hint }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!profileResponse.ok || profile?.error) {
        console.error('Profile fetch error:', profile?.error || profileResponse.status);
        return new Response(
          JSON.stringify({
            error:
              profile?.error?.message ||
              profile?.error_description ||
              profile?.error ||
              `Failed to fetch profile (status ${profileResponse.status})`,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Token exchanged successfully for user: ${profile.display_name || profile.id}`);

      return new Response(
        JSON.stringify({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          user: {
            id: profile.id,
            display_name: profile.display_name,
            email: profile.email,
            images: profile.images,
            country: profile.country,
            product: profile.product,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'refresh_token') {
      // Refresh access token
      console.log('Refreshing access token...');
      
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error('Token refresh error:', tokenData.error);
        return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Token refreshed successfully');
      return new Response(JSON.stringify({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Spotify auth error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
