import { useState } from "react";
import { Music, Disc3, User, Podcast, ListMusic, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SpotifyUserData } from "@/lib/spotify";

interface DataSelectorProps {
  userData: SpotifyUserData;
  selectedItems: {
    playlists: Set<string>;
    tracks: boolean;
    albums: boolean;
    artists: boolean;
    podcasts: boolean;
  };
  onSelectionChange: (selection: DataSelectorProps['selectedItems']) => void;
}

export function DataSelector({ userData, selectedItems, onSelectionChange }: DataSelectorProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('playlists');

  const togglePlaylist = (id: string) => {
    const newPlaylists = new Set(selectedItems.playlists);
    if (newPlaylists.has(id)) {
      newPlaylists.delete(id);
    } else {
      newPlaylists.add(id);
    }
    onSelectionChange({ ...selectedItems, playlists: newPlaylists });
  };

  const toggleAllPlaylists = () => {
    const allSelected = userData.playlists.every(p => selectedItems.playlists.has(p.id));
    const newPlaylists = new Set<string>();
    if (!allSelected) {
      userData.playlists.forEach(p => newPlaylists.add(p.id));
    }
    onSelectionChange({ ...selectedItems, playlists: newPlaylists });
  };

  const sections = [
    {
      id: 'playlists',
      icon: ListMusic,
      title: 'Playlists',
      count: userData.playlists.length,
      selected: selectedItems.playlists.size,
    },
    {
      id: 'tracks',
      icon: Music,
      title: 'Liked Songs',
      count: userData.savedTracks.length,
      checked: selectedItems.tracks,
      onChange: () => onSelectionChange({ ...selectedItems, tracks: !selectedItems.tracks }),
    },
    {
      id: 'albums',
      icon: Disc3,
      title: 'Saved Albums',
      count: userData.savedAlbums.length,
      checked: selectedItems.albums,
      onChange: () => onSelectionChange({ ...selectedItems, albums: !selectedItems.albums }),
    },
    {
      id: 'artists',
      icon: User,
      title: 'Followed Artists',
      count: userData.followedArtists.length,
      checked: selectedItems.artists,
      onChange: () => onSelectionChange({ ...selectedItems, artists: !selectedItems.artists }),
    },
    {
      id: 'podcasts',
      icon: Podcast,
      title: 'Saved Podcasts',
      count: userData.savedShows.length,
      checked: selectedItems.podcasts,
      onChange: () => onSelectionChange({ ...selectedItems, podcasts: !selectedItems.podcasts }),
    },
  ];

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Chọn dữ liệu để chuyển đổi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isPlaylist = section.id === 'playlists';
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="space-y-2">
              <div 
                className={`flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors ${isPlaylist ? 'cursor-pointer' : ''}`}
                onClick={() => isPlaylist && setExpandedSection(isExpanded ? null : section.id)}
              >
                <div className="flex items-center gap-3">
                  {!isPlaylist && (
                    <Checkbox
                      checked={section.checked}
                      onCheckedChange={section.onChange}
                      className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )}
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{section.title}</span>
                </div>
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  {isPlaylist ? `${section.selected}/${section.count}` : section.count}
                </Badge>
              </div>

              {isPlaylist && isExpanded && (
                <div className="ml-4 space-y-1 animate-fade-in">
                  <div 
                    className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                    onClick={toggleAllPlaylists}
                  >
                    <Checkbox
                      checked={userData.playlists.every(p => selectedItems.playlists.has(p.id))}
                      className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className="text-sm font-medium text-muted-foreground">Chọn tất cả</span>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-1 pr-4">
                      {userData.playlists.map((playlist) => (
                        <div
                          key={playlist.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-secondary/50 cursor-pointer"
                          onClick={() => togglePlaylist(playlist.id)}
                        >
                          <Checkbox
                            checked={selectedItems.playlists.has(playlist.id)}
                            className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{playlist.name}</p>
                            <p className="text-xs text-muted-foreground">{playlist.tracks_total} bài hát</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
