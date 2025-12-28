import { User, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SpotifyAccount } from "@/hooks/useSpotifyAuth";

interface AccountCardProps {
  title: string;
  subtitle: string;
  account: SpotifyAccount;
  onLogin: () => void;
  onLogout: () => void;
  variant: 'source' | 'target';
}

export function AccountCard({ 
  title, 
  subtitle, 
  account, 
  onLogin, 
  onLogout,
  variant 
}: AccountCardProps) {
  const { user, isLoading, error } = account;

  return (
    <Card className="flex-1 border-border/50 bg-card/80 backdrop-blur-sm hover:bg-card/90 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`h-4 w-4 rounded-full ${variant === 'source' ? 'bg-orange-500' : 'bg-primary'} shadow-lg ${variant === 'source' ? 'shadow-orange-500/30' : 'shadow-primary/30'}`} />
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
              <Avatar className="h-14 w-14 border-2 border-primary/40 shadow-lg">
                <AvatarImage src={user.images?.[0]?.url} alt={user.display_name || 'User'} />
                <AvatarFallback className="bg-secondary text-lg">
                  {(user.display_name || user.id).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate text-lg">
                  {user.display_name || user.id}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${user.product === 'premium' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {user.product === 'premium' ? 'Premium' : 'Free'}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.country}</span>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đổi tài khoản
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 animate-fade-in">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <Button 
              onClick={onLogin} 
              disabled={isLoading}
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 text-base shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <svg className="mr-3 h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Kết nối Spotify
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Đăng nhập an toàn qua Spotify
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
