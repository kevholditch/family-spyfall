import React, { useEffect, useState } from 'react';
import { generateQRCode, getJoinUrl } from '../utils/qrCode';
import { Copy, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  gameId: string;
  className?: string;
}

export function QRCodeDisplay({ gameId, className = '' }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const joinUrl = getJoinUrl(gameId);
    
    generateQRCode(joinUrl)
      .then(setQrCodeUrl)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [gameId]);

  const handleCopyUrl = async () => {
    const joinUrl = getJoinUrl(gameId);
    
    // Check if clipboard API is available (requires HTTPS or localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.error('Clipboard API failed:', err);
        // Fall through to legacy method
      }
    }
    
    // Fallback for older browsers or non-secure contexts
    try {
      const textArea = document.createElement('textarea');
      textArea.value = joinUrl;
      textArea.style.position = 'fixed';  // Prevent scrolling to bottom
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Generating QR code...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <p className="text-red-600 mb-2">Error generating QR code</p>
        <button
          onClick={handleCopyUrl}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Join URL
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`text-center ${className}`} data-testid="qr-code-container" data-game-id={gameId}>
      <div className="mb-4">
        <img
          src={qrCodeUrl}
          alt="QR code to join the game"
          className="mx-auto border border-gray-300 rounded-lg"
          style={{ imageRendering: 'pixelated' }}
          data-testid="qr-code"
        />
      </div>
      <p className="text-sm text-gray-600 mb-2">
        Scan to join the game
      </p>
      <button
        onClick={handleCopyUrl}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 mr-2" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 mr-2" />
            Copy Join URL
          </>
        )}
      </button>
    </div>
  );
}
