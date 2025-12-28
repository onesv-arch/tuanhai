import { useState, useEffect } from "react";
import { ArrowRight, ArrowDown, Loader2, Music, Disc3, User, Podcast, ListMusic, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SpotifyLogo } from "@/components/SpotifyLogo";
import { AccountCard } from "@/components/AccountCard";
import { DataSelector } from "@/components/DataSelector";
import { TransferProgress } from "@/components/TransferProgress";
import { useSpotifyAuth } from "@/hooks/useSpotifyAuth";
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

  // Load data from sessionStorage (persists within browser session, clears on close)
  useEffect(() => {
    const lastIds = {
      source: sourceAccount.user?.id ?? null,
      target: targetAccount.user?.id ?? null,
    };

    const loadAccountData = () => {
      const sourceData = sessionStorage.getItem('spotify_source_data');
      const targetData = sessionStorage.getItem('spotify_target_data');

      if (sourceData) {
        try {
          const parsed = JSON.parse(sourceData);
          if (parsed?.user?.id && parsed.user.id !== lastIds.source) {
            lastIds.source = parsed.user.id;
            setSourceAccount({
              user: parsed.user,
              tokens: parsed.tokens,
              userData: parsed.userData,
              isLoading: false,
              error: null,
            });
            toast({
              title: "Đã kết nối!",
              description: `Chào mừng ${parsed.user.display_name || parsed.user.id}`,
            });
          } else if (parsed?.user?.id && !sourceAccount.user) {
            setSourceAccount({
              user: parsed.user,
              tokens: parsed.tokens,
              userData: parsed.userData,
              isLoading: false,
              error: null,
            });
          }
        } catch (e) {
          console.error('Failed to parse source data:', e);
        }
      }

      if (targetData) {
        try {
          const parsed = JSON.parse(targetData);
          if (parsed?.user?.id && parsed.user.id !== lastIds.target) {
            lastIds.target = parsed.user.id;
            setTargetAccount({
              user: parsed.user,
              tokens: parsed.tokens,
              userData: parsed.userData,
              isLoading: false,
              error: null,
            });
            toast({
              title: "Đã kết nối!",
              description: `Chào mừng ${parsed.user.display_name || parsed.user.id}`,
            });
          } else if (parsed?.user?.id && !targetAccount.user) {
            setTargetAccount({
              user: parsed.user,
              tokens: parsed.tokens,
              userData: parsed.userData,
              isLoading: false,
              error: null,
            });
          }
        } catch (e) {
          console.error('Failed to parse target data:', e);
        }
      }
    };

    loadAccountData();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'spotify_source_data' || e.key === 'spotify_target_data') {
        loadAccountData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', loadAccountData);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', loadAccountData);
    };
  }, [setSourceAccount, setTargetAccount, toast, sourceAccount.user, targetAccount.user]);

  const canTransfer = sourceAccount.user && targetAccount.user && sourceAccount.tokens && targetAccount.tokens;
  const bothConnected = sourceAccount.user && targetAccount.user;

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
      { icon: ListMusic, label: 'Playlists', count: playlists.length, color: 'text-purple-400' },
      { icon: Music, label: 'Bài hát', count: savedTracks.length, color: 'text-pink-400' },
      { icon: Disc3, label: 'Albums', count: savedAlbums.length, color: 'text-blue-400' },
      { icon: User, label: 'Nghệ sĩ', count: followedArtists.length, color: 'text-orange-400' },
      { icon: Podcast, label: 'Podcasts', count: savedShows.length, color: 'text-teal-400' },
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#121212] via-[#181818] to-[#121212]">
      {/* Header */}
      <header className="border-b border-border/20 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <SpotifyLogo />
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground animate-fade-in">
            Chuyển đổi tài khoản{" "}
            <span className="text-primary">Spotify</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Di chuyển toàn bộ dữ liệu giữa hai tài khoản một cách nhanh chóng và an toàn
          </p>
        </div>

        {/* Account Cards - Side by Side */}
        <div className="grid md:grid-cols-2 gap-6">
          <AccountCard
            title="Tài khoản nguồn"
            subtitle="Nơi lấy dữ liệu"
            account={sourceAccount}
            onLogin={loginSource}
            onLogout={logoutSource}
            variant="source"
          />

          <AccountCard
            title="Tài khoản đích"
            subtitle="Nơi nhận dữ liệu"
            account={targetAccount}
            onLogin={loginTarget}
            onLogout={logoutTarget}
            variant="target"
          />
        </div>

        {/* Connection Status */}
        {(sourceAccount.user || targetAccount.user) && (
          <Card className="border-border/30 bg-card/50 backdrop-blur animate-fade-in">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-4">
                <div className={`flex items-center gap-2 ${sourceAccount.user ? 'text-primary' : 'text-muted-foreground'}`}>
                  {sourceAccount.user ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="font-medium">Nguồn</span>
                </div>
                <ArrowRight className={`h-5 w-5 ${bothConnected ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className={`flex items-center gap-2 ${targetAccount.user ? 'text-primary' : 'text-muted-foreground'}`}>
                  {targetAccount.user ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-current" />}
                  <span className="font-medium">Đích</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data Summary */}
        {sourceAccount.userData && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 animate-fade-in">
            {getDataSummary()?.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card 
                  key={item.label}
                  className="border-border/30 bg-card/50 backdrop-blur hover:bg-card/70 transition-all cursor-default"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <CardContent className="p-4 text-center">
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${item.color}`} />
                    <p className="text-2xl font-bold">{item.count.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </CardContent>
                </Card>
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

        {/* Transfer Button - Always visible when both connected */}
        {canTransfer && (
          <div className="flex flex-col items-center gap-4 animate-fade-in py-4">
            <ArrowDown className="h-6 w-6 text-muted-foreground animate-bounce" />
            <Button
              size="lg"
              onClick={handleTransfer}
              disabled={isTransferring}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg px-16 py-7 rounded-full shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                  Đang chuyển đổi...
                </>
              ) : (
                <>
                  <Sparkles className="mr-3 h-6 w-6" />
                  CHUYỂN ĐỔI
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground">
              Nhấn để bắt đầu chuyển dữ liệu
            </p>
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
      <footer className="border-t border-border/20 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Spotify Migration Tool • Trikatuka Universe</p>
          <p className="mt-1 text-xs">Không được Spotify xác nhận hoặc liên kết</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
