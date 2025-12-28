import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchAllPages(url: string, accessToken: string, limit = 50): Promise<any[]> {
  const items: any[] = [];
  let nextUrl: string | null = `${url}${url.includes('?') ? '&' : '?'}limit=${limit}`;

  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || 'Failed to fetch data');
    }
    
    const json: { items?: any[]; next?: string | null } = await res.json();
    items.push(...(json.items || []));
    nextUrl = json.next || null;
  }

  return items;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, access_token, data } = await req.json();
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

      return new Response(JSON.stringify({
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
          artists: t.track?.artists?.map((a: any) => a.name).join(', '),
          album: t.track?.album?.name,
          added_at: t.added_at,
        })),
        savedAlbums: savedAlbums.map(a => ({
          id: a.album?.id,
          name: a.album?.name,
          artists: a.album?.artists?.map((ar: any) => ar.name).join(', '),
          images: a.album?.images,
          added_at: a.added_at,
        })),
        followedArtists: followedArtists.map((a: any) => ({
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
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'transfer_data') {
      const { source_token, target_token, transfer_options } = data;
      const results: any = { success: [], failed: [] };

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
            const errMsg = err instanceof Error ? err.message : 'Unknown error';
            results.failed.push({ type: 'playlist', id: playlistId, error: errMsg });
          }
        }
      }

      console.log('Transfer complete:', results);
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Spotify data error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
