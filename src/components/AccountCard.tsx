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
    <Card className="flex-1 border-border/50 bg-card/50 backdrop-blur spotify-card-gradient">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className={`h-3 w-3 rounded-full ${variant === 'source' ? 'bg-orange-500' : 'bg-primary'}`} />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-primary/30">
                <AvatarImage src={user.images?.[0]?.url} alt={user.display_name || 'User'} />
                <AvatarFallback className="bg-secondary">
                  <User className="h-8 w-8 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {user.display_name || user.id}
                </p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.product} • {user.country}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLogout}
              className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive animate-fade-in">{error}</p>
            )}
            <Button 
              onClick={onLogin} 
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang kết nối...
                </>
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Đăng nhập với Spotify
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
