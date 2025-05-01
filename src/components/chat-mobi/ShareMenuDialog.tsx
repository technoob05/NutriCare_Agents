import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Facebook, Twitter, Link2, Check, Heart, HeartOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ShareMenuDialogProps {
  menuData: any;
  menuType: 'daily' | 'weekly';
  onSaveToCollection?: () => void;
  isSaved?: boolean;
}

export function ShareMenuDialog({ menuData, menuType, onSaveToCollection, isSaved }: ShareMenuDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [shareUrl, setShareUrl] = React.useState('');

  // Generate share URL when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      // In real implementation, this would call your API to create a shareable link
      const baseUrl = window.location.origin;
      const shareId = Math.random().toString(36).substring(7);
      setShareUrl(`${baseUrl}/shared-menu/${shareId}`);
    }
  }, [isOpen]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: "Đã sao chép!",
        description: "Link chia sẻ đã được sao chép vào clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Lỗi sao chép",
        description: "Không thể sao chép link. Vui lòng thử lại.",
        variant: "destructive",
      });
    }
  };

  const handleShare = (platform: 'facebook' | 'twitter') => {
    const text = `Xem thực đơn ${menuType === 'daily' ? 'ngày' : 'tuần'} của tôi tại NutriCare!`;
    let url = '';

    switch (platform) {
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
    }

    // Open in new window with proper dimensions
    const width = 575;
    const height = 400;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    window.open(
      url,
      'share',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(true);
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          {onSaveToCollection && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onSaveToCollection();
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={isSaved ? 'saved' : 'unsaved'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {isSaved ? (
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                  ) : (
                    <Heart className="h-4 w-4" />
                  )}
                </motion.div>
              </AnimatePresence>
            </Button>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chia sẻ thực đơn</DialogTitle>
          <DialogDescription>
            Chia sẻ thực đơn {menuType === 'daily' ? 'ngày' : 'tuần'} của bạn với mọi người
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center space-x-2 mt-4">
          <div className="grid flex-1 gap-2">
            <Input
              value={shareUrl}
              readOnly
              className="w-full"
            />
          </div>
          <Button 
            size="icon" 
            className={`h-9 w-9 ${copied ? "bg-green-500 hover:bg-green-600" : ""}`}
            onClick={handleCopyLink}
            variant={copied ? "default" : "secondary"}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Chia sẻ qua mạng xã hội</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => handleShare('facebook')}
            >
              <Facebook className="h-4 w-4 text-blue-600" />
              Facebook
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center gap-2"
              onClick={() => handleShare('twitter')}
            >
              <Twitter className="h-4 w-4 text-blue-400" />
              Twitter
            </Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex items-start gap-2">
            <Link2 className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Link chia sẻ có hiệu lực trong 30 ngày và chỉ cho phép xem thực đơn
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}