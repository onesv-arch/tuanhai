require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Helper function to fetch all paginated data
async function fetchAllPages(url, accessToken, limit = 50) {
  const items = [];
  let nextUrl = `${url}${url.includes('?') ? '&' : '?'}limit=${limit}`;

  while (nextUrl) {
    const res = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Failed to fetch data');
    }
    
    const json = await res.json();
    items.push(...(json.items || []));
    nextUrl = json.next || null;
  }

  return items;
}

// Helper function to chunk array
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==================== SPOTIFY AUTH ENDPOINTS ====================

app.post('/api/spotify-auth', async (req, res) => {
  try {
    const { action, code, redirect_uri, refresh_token, account_type } = req.body;
    console.log(`Spotify Auth Action: ${action} for ${account_type || 'unknown'} account`);

    if (action === 'get_auth_url') {
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
      return res.json({ auth_url: authUrl });
    }

    if (action === 'exchange_token') {
      console.log('Exchanging code for token...');

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      });

      const tokenText = await tokenResponse.text();
      let tokenData;
      try {
        tokenData = JSON.parse(tokenText);
      } catch {
        console.error('Token endpoint returned non-JSON:', tokenText.slice(0, 200));
        return res.json({
          error: `Spotify token endpoint returned non-JSON (status ${tokenResponse.status}). Please verify Redirect URI + Client Secret in Spotify app settings.`,
        });
      }

      if (!tokenResponse.ok || tokenData?.error) {
        console.error('Token exchange error:', tokenData?.error || tokenResponse.status);
        return res.json({
          error: tokenData?.error_description || tokenData?.error || `Token exchange failed (status ${tokenResponse.status})`,
        });
      }

      // Get user profile
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const profileText = await profileResponse.text();
      let profile;
      try {
        profile = JSON.parse(profileText);
      } catch {
        console.error('Profile endpoint returned non-JSON:', profileText.slice(0, 200));
        const hint = profileResponse.status === 403 
          ? 'Tài khoản này chưa được thêm vào danh sách test users. Vào Spotify Developer Dashboard → App → Settings → User Management và thêm email của tài khoản.'
          : `Spotify profile endpoint returned non-JSON (status ${profileResponse.status}). Try again.`;
        return res.json({ error: hint });
      }

      if (!profileResponse.ok || profile?.error) {
        console.error('Profile fetch error:', profile?.error || profileResponse.status);
        return res.json({
          error: profile?.error?.message || profile?.error_description || profile?.error || `Failed to fetch profile (status ${profileResponse.status})`,
        });
      }

      console.log(`Token exchanged successfully for user: ${profile.display_name || profile.id}`);

      return res.json({
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
      });
    }

    if (action === 'refresh_token') {
      console.log('Refreshing access token...');
      
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token,
        }),
      });

      const tokenData = await tokenResponse.json();
      
      if (tokenData.error) {
        console.error('Token refresh error:', tokenData.error);
        return res.status(400).json({ error: tokenData.error_description || tokenData.error });
      }

      console.log('Token refreshed successfully');
      return res.json({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in,
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Spotify auth error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// ==================== SPOTIFY DATA ENDPOINTS ====================

app.post('/api/spotify-data', async (req, res) => {
  try {
    const { action, access_token, data } = req.body;
    console.log(`Spotify Data Action: ${action}`);

    if (action === 'get_user_data') {
      console.log('Fetching all user data...');
      
      // Fetch all data in parallel
      const [playlists, savedTracks, savedAlbums, followedArtists, savedShows] = await Promise.all([
        fetchAllPages('https://api.spotify.com/v1/me/playlists', access_token),
        fetchAllPages('https://api.spotify.com/v1/me/tracks', access_token),
        fetchAllPages('https://api.spotify.com/v1/me/albums', access_token),
        fetch('https://api.spotify.com/v1/me/following?type=artist&limit=50', {
          headers: { 'Authorization': `Bearer ${access_token}` },
        }).then(r => r.json()).then(d => d.artists?.items || []),
        fetchAllPages('https://api.spotify.com/v1/me/shows', access_token),
      ]);

      console.log(`Fetched: ${playlists.length} playlists, ${savedTracks.length} tracks, ${savedAlbums.length} albums, ${followedArtists.length} artists, ${savedShows.length} podcasts`);

      return res.json({
        playlists: playlists.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          images: p.images,
          tracks_total: p.tracks?.total || 0,
          public: p.public,
          owner: p.owner,
        })),
        savedTracks: savedTracks.map(t => ({
          id: t.track?.id,
          name: t.track?.name,
          artists: t.track?.artists?.map(a => a.name).join(', '),
          album: t.track?.album?.name,
          added_at: t.added_at,
        })),
        savedAlbums: savedAlbums.map(a => ({
          id: a.album?.id,
          name: a.album?.name,
          artists: a.album?.artists?.map(ar => ar.name).join(', '),
          images: a.album?.images,
          added_at: a.added_at,
        })),
        followedArtists: followedArtists.map(a => ({
          id: a.id,
          name: a.name,
          images: a.images,
          genres: a.genres,
        })),
        savedShows: savedShows.map(s => ({
          id: s.show?.id,
          name: s.show?.name,
          publisher: s.show?.publisher,
          images: s.show?.images,
          added_at: s.added_at,
        })),
      });
    }

    if (action === 'transfer_data') {
      const { source_token, target_token, transfer_options } = data;
      const results = { success: [], failed: [] };

      console.log('Starting data transfer...');

      // Transfer saved tracks
      if (transfer_options.tracks && transfer_options.trackIds?.length > 0) {
        console.log(`Transferring ${transfer_options.trackIds.length} tracks...`);
        const chunks = chunkArray(transfer_options.trackIds, 50);
        for (const chunk of chunks) {
          const response = await fetch('https://api.spotify.com/v1/me/tracks', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${target_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: chunk }),
          });
          if (response.ok) {
            results.success.push({ type: 'tracks', count: chunk.length });
          } else {
            const error = await response.json();
            results.failed.push({ type: 'tracks', error: error.error?.message });
          }
        }
      }

      // Transfer saved albums
      if (transfer_options.albums && transfer_options.albumIds?.length > 0) {
        console.log(`Transferring ${transfer_options.albumIds.length} albums...`);
        const chunks = chunkArray(transfer_options.albumIds, 50);
        for (const chunk of chunks) {
          const response = await fetch('https://api.spotify.com/v1/me/albums', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${target_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: chunk }),
          });
          if (response.ok) {
            results.success.push({ type: 'albums', count: chunk.length });
          } else {
            const error = await response.json();
            results.failed.push({ type: 'albums', error: error.error?.message });
          }
        }
      }

      // Follow artists
      if (transfer_options.artists && transfer_options.artistIds?.length > 0) {
        console.log(`Following ${transfer_options.artistIds.length} artists...`);
        const chunks = chunkArray(transfer_options.artistIds, 50);
        for (const chunk of chunks) {
          const response = await fetch(`https://api.spotify.com/v1/me/following?type=artist`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${target_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: chunk }),
          });
          if (response.ok) {
            results.success.push({ type: 'artists', count: chunk.length });
          } else {
            const error = await response.json();
            results.failed.push({ type: 'artists', error: error.error?.message });
          }
        }
      }

      // Save shows (podcasts)
      if (transfer_options.podcasts && transfer_options.showIds?.length > 0) {
        console.log(`Saving ${transfer_options.showIds.length} podcasts...`);
        const chunks = chunkArray(transfer_options.showIds, 50);
        for (const chunk of chunks) {
          const response = await fetch('https://api.spotify.com/v1/me/shows', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${target_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ids: chunk }),
          });
          if (response.ok) {
            results.success.push({ type: 'podcasts', count: chunk.length });
          } else {
            const error = await response.json();
            results.failed.push({ type: 'podcasts', error: error.error?.message });
          }
        }
      }

      // Transfer playlists
      if (transfer_options.playlists && transfer_options.playlistIds?.length > 0) {
        console.log(`Transferring ${transfer_options.playlistIds.length} playlists...`);
        
        // Get target user ID
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
          headers: { 'Authorization': `Bearer ${target_token}` },
        });
        const targetUser = await userResponse.json();

        for (const playlistId of transfer_options.playlistIds) {
          try {
            // Get playlist details from source
            const playlistResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
              headers: { 'Authorization': `Bearer ${source_token}` },
            });
            const playlist = await playlistResponse.json();

            // Create new playlist on target account
            const createResponse = await fetch(`https://api.spotify.com/v1/users/${targetUser.id}/playlists`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${target_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: playlist.name,
                description: playlist.description || '',
                public: false,
              }),
            });
            const newPlaylist = await createResponse.json();

            if (newPlaylist.id) {
              // Get all tracks from source playlist
              const tracks = await fetchAllPages(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                source_token,
                100
              );

              // Add tracks to new playlist
              const trackUris = tracks.map(t => t.track?.uri).filter(Boolean);
              const trackChunks = chunkArray(trackUris, 100);
              
              for (const chunk of trackChunks) {
                await fetch(`https://api.spotify.com/v1/playlists/${newPlaylist.id}/tracks`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${target_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ uris: chunk }),
                });
              }

              results.success.push({ type: 'playlist', name: playlist.name, tracks: trackUris.length });
            }
          } catch (err) {
            results.failed.push({ type: 'playlist', id: playlistId, error: err.message || 'Unknown error' });
          }
        }
      }

      console.log('Transfer complete:', results);
      return res.json(results);
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('Spotify data error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Spotify Transfer Backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
