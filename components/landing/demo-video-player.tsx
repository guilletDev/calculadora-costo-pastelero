'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';

export function DemoVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch((error) => {
      console.error('[demo-video-player] No se pudo reproducir el video:', error);
    });
  };

  return (
    <div className="relative group cursor-pointer overflow-hidden rounded-2xl border border-[#e4bdc2]/40 shadow-2xl block">
      <video
        ref={videoRef}
        src="https://usioaeatazqrilornahh.supabase.co/storage/v1/object/public/democosto/democostorepostero.mp4?v=2"
        loop
        controls
        playsInline
        preload="metadata"
        className="w-full h-auto block"
        style={{ colorScheme: 'light' }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      >
        Tu navegador no admite la reproducción de este video.
      </video>

      {!isPlaying && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Reproducir video demostrativo"
          className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all group-hover:bg-black/30"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[#b80049] shadow-2xl transition-transform duration-200 group-hover:scale-105">
            <Play aria-hidden="true" className="ml-1 h-7 w-7 fill-current" />
          </span>
        </button>
      )}
    </div>
  );
}
