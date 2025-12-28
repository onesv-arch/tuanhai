import { useState, useEffect } from "react";
import { ArrowRight, ArrowLeftRight, Loader2, Music, Disc3, User, Podcast, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SpotifyLogo } from "@/components/SpotifyLogo";
import { AccountCard } from "@/components/AccountCard";
import { DataSelector } from "@/components/DataSelector";
import { TransferProgress } from "@/components/TransferProgress";
import { useSpotifyAuth, SpotifyAccount } from "@/hooks/useSpotifyAuth";
import { transferSpotifyData, TransferResult } from "@/lib/spotify";

const Index = () => {
  const { toast } = useToast();
  const {
    sourceAccount,
    targetAccount,
    loginSource,
    loginTarget,
    logoutSource,
    logoutTarget,
    setSourceAccount,
    setTargetAccount,
  } = useSpotifyAuth();

  const [selectedItems, setSelectedItems] = useState({
    playlists: new Set<string>(),
    tracks: true,
    albums: true,
    artists: true,
    podcasts: true,
  });

  const [isTransferring, setIsTransferring] = useState(false);
  const [transferProgress, setTransferProgress] = useState(0);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Load data from session storage on mount
  useEffect(() => {
    const sourceData = sessionStorage.getItem('spotify_source_data');
    const targetData = sessionStorage.getItem('spotify_target_data');

    if (sourceData) {
      try {
        const parsed = JSON.parse(sourceData);
        setSourceAccount({
          user: parsed.user,
          tokens: parsed.tokens,
          userData: parsed.userData,
          isLoading: false,
          error: null,
        });
        sessionStorage.removeItem('spotify_source_data');
      } catch (e) {
        console.error('Failed to parse source data:', e);
      }
    }

    if (targetData) {
      try {
        const parsed = JSON.parse(targetData);
        setTargetAccount({
          user: parsed.user,
          tokens: parsed.tokens,
          userData: parsed.userData,
          isLoading: false,
          error: null,
        });
        sessionStorage.removeItem('spotify_target_data');
      } catch (e) {
        console.error('Failed to parse target data:', e);
      }
    }
  }, [setSourceAccount, setTargetAccount]);

  const canTransfer = sourceAccount.user && targetAccount.user && sourceAccount.tokens && targetAccount.tokens;

  const handleTransfer = async () => {
    if (!sourceAccount.tokens || !targetAccount.tokens || !sourceAccount.userData) {
      toast({
        title: "Lỗi",
        description: "Vui lòng đăng nhập cả hai tài khoản",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    setTransferProgress(0);
    setTransferResult(null);
    setTransferError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setTransferProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await transferSpotifyData(
        sourceAccount.tokens.access_token,
        targetAccount.tokens.access_token,
        {
          playlists: selectedItems.playlists.size > 0,
          tracks: selectedItems.tracks,
          albums: selectedItems.albums,
          artists: selectedItems.artists,
          podcasts: selectedItems.podcasts,
          playlistIds: Array.from(selectedItems.playlists),
          trackIds: selectedItems.tracks ? sourceAccount.userData.savedTracks.map(t => t.id) : [],
          albumIds: selectedItems.albums ? sourceAccount.userData.savedAlbums.map(a => a.id) : [],
          artistIds: selectedItems.artists ? sourceAccount.userData.followedArtists.map(a => a.id) : [],
          showIds: selectedItems.podcasts ? sourceAccount.userData.savedShows.map(s => s.id) : [],
        }
      );

      clearInterval(progressInterval);
      setTransferProgress(100);
      setTransferResult(result);

      toast({
        title: "Hoàn thành!",
        description: `Đã chuyển đổi ${result.success.length} mục thành công`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      setTransferError(message);
      toast({
        title: "Lỗi",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const getDataSummary = () => {
    if (!sourceAccount.userData) return null;
    const { playlists, savedTracks, savedAlbums, followedArtists, savedShows } = sourceAccount.userData;
    
    return [
      { icon: ListMusic, label: 'Playlists', count: playlists.length },
      { icon: Music, label: 'Liked Songs', count: savedTracks.length },
      { icon: Disc3, label: 'Albums', count: savedAlbums.length },
      { icon: User, label: 'Artists', count: followedArtists.length },
      { icon: Podcast, label: 'Podcasts', count: savedShows.length },
    ];
  };

  return (
    <div className="min-h-screen spotify-gradient">
      {/* Header */}
      <header className="border-b border-border/30 bg-background/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <SpotifyLogo />
          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
            Beta
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent animate-fade-in">
            Chuyển đổi tài khoản Spotify
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Di chuyển playlists, bài hát, album, nghệ sĩ và podcast giữa hai tài khoản Spotify một cách dễ dàng
          </p>
        </div>

        {/* Account Cards */}
        <div className="grid md:grid-cols-2 gap-6 relative">
          <AccountCard
            title="Tài khoản nguồn"
            subtitle="Đăng nhập tài khoản cũ của bạn"
            account={sourceAccount}
            onLogin={loginSource}
            onLogout={logoutSource}
            variant="source"
          />

          {/* Transfer Arrow */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="bg-background border border-border rounded-full p-3 shadow-lg">
              <ArrowLeftRight className="h-6 w-6 text-primary" />
            </div>
          </div>

          <AccountCard
            title="Tài khoản đích"
            subtitle="Đăng nhập tài khoản mới của bạn"
            account={targetAccount}
            onLogin={loginTarget}
            onLogout={logoutTarget}
            variant="target"
          />
        </div>

        {/* Data Summary */}
        {sourceAccount.userData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
            {getDataSummary()?.map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.label}
                  className="bg-card/50 border border-border/50 rounded-lg p-4 text-center backdrop-blur"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Data Selector */}
        {sourceAccount.userData && targetAccount.user && (
          <DataSelector
            userData={sourceAccount.userData}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
          />
        )}

        {/* Transfer Button */}
        {canTransfer && (
          <div className="flex justify-center animate-fade-in">
            <Button
              size="lg"
              onClick={handleTransfer}
              disabled={isTransferring}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-12 py-6 rounded-full animate-pulse-glow"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang chuyển đổi...
                </>
              ) : (
                <>
                  Bắt đầu chuyển đổi
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        )}

        {/* Transfer Progress */}
        <TransferProgress
          isTransferring={isTransferring}
          progress={transferProgress}
          result={transferResult}
          error={transferError}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Spotify Migration Tool • Được xây dựng với ❤️</p>
          <p className="mt-1">Ứng dụng này không được Spotify liên kết hoặc xác nhận</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
