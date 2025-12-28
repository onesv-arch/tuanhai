import { Music } from "lucide-react";

export function SpotifyLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <Music className="h-8 w-8 text-primary" />
      </div>
      <span className="text-xl font-bold text-foreground">Spotify Migration</span>
    </div>
  );
}
