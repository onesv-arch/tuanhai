import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SpotifyLogo } from "@/components/SpotifyLogo";
import { exchangeSpotifyToken, getSpotifyUserData } from "@/lib/spotify";

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xử lý đăng nhập...');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setMessage(searchParams.get('error_description') || 'Đăng nhập bị từ chối');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Không tìm thấy mã xác thực');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      try {
        // Use localStorage so data persists across tabs
        let accountType = localStorage.getItem('spotify_auth_type') as 'source' | 'target' | null;
        
        if (!accountType) {
          // Try to extract from state (format: "source_timestamp" or "target_timestamp")
          const stateType = state?.split('_')[0] as 'source' | 'target' | undefined;
          if (stateType === 'source' || stateType === 'target') {
            accountType = stateType;
          }
        }

        if (!accountType) {
          throw new Error('Không xác định được loại tài khoản');
        }

        setMessage('Đang xác thực với Spotify...');
        const { tokens, user } = await exchangeSpotifyToken(code);
        
        setMessage('Đang tải dữ liệu...');
        const userData = await getSpotifyUserData(tokens.access_token);

        // Store in localStorage for the main app to pick up (shared across tabs)
        localStorage.setItem(`spotify_${accountType}_data`, JSON.stringify({
          user,
          tokens,
          userData,
        }));
        localStorage.removeItem('spotify_auth_type');

        setStatus('success');
        setMessage(`Đăng nhập thành công! Xin chào, ${user.display_name || user.id}`);
        
        setTimeout(() => navigate('/'), 1500);
      } catch (err) {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen spotify-gradient flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="pt-6 space-y-6 text-center">
          <SpotifyLogo className="justify-center" />
          
          <div className="space-y-4">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 mx-auto text-primary animate-fade-in" />
            )}
            {status === 'error' && (
              <XCircle className="h-12 w-12 mx-auto text-destructive animate-fade-in" />
            )}
            
            <p className={`text-lg ${status === 'error' ? 'text-destructive' : 'text-foreground'}`}>
              {message}
            </p>
            
            {status !== 'loading' && (
              <p className="text-sm text-muted-foreground">
                Đang chuyển hướng...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Callback;
