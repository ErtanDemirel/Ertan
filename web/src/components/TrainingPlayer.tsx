import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Lock } from 'lucide-react';

/**
 * İleri sarılamayan, kaldığı yerden devam eden eğitim videosu oynatıcı.
 * - Yerel kontrol yok (seek çubuğu yok) → ileri atlanamaz.
 * - "seeking" olayında izlenen en ileri konumun ötesine geçiş engellenir.
 * - loadedmetadata'da resume konumuna gidilir (kaldığı yer).
 * - İlerleme periyodik + duraklama + bitişte üst bileşene bildirilir.
 */
export default function TrainingPlayer({
  src, resumeAt, onProgress, onCompleted,
}: {
  src: string;
  resumeAt: number;
  onProgress: (position: number, duration: number) => void;
  onCompleted: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const maxWatched = useRef(resumeAt);
  const lastReport = useRef(0);
  const posRef = useRef(resumeAt);
  const durRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(resumeAt);
  const [dur, setDur] = useState(0);

  // Ayrılırken son konumu bildir
  useEffect(() => () => { if (posRef.current > 0) onProgress(posRef.current, durRef.current); }, [onProgress]);

  function fmt(s: number) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${m}:${ss.toString().padStart(2, '0')}`;
  }

  function report(force = false) {
    const v = ref.current; if (!v) return;
    if (force || v.currentTime - lastReport.current >= 5) {
      lastReport.current = v.currentTime;
      onProgress(v.currentTime, v.duration || 0);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl bg-black">
      <video
        ref={ref}
        src={src}
        className="w-full"
        playsInline
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDur(v.duration); durRef.current = v.duration;
          const start = Math.min(maxWatched.current, Math.max(0, v.duration - 0.3));
          if (start > 0) { v.currentTime = start; setPos(start); posRef.current = start; }
        }}
        onSeeking={(e) => {
          const v = e.currentTarget;
          // İzlenen en ileri noktanın ötesine ileri sarma engeli
          if (v.currentTime > maxWatched.current + 0.75) v.currentTime = maxWatched.current;
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setPos(v.currentTime); posRef.current = v.currentTime;
          if (v.currentTime > maxWatched.current) maxWatched.current = v.currentTime;
          report();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => { setPlaying(false); report(true); }}
        onEnded={() => { setPlaying(false); onProgress(durRef.current, durRef.current); onCompleted(); }}
      />
      {/* Özel kontrol çubuğu (seek yok) */}
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-2.5 text-white">
        <button onClick={() => { const v = ref.current; if (!v) return; v.paused ? v.play() : v.pause(); }} className="rounded-full bg-brand-600 p-2">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full rounded-full bg-brand-500" style={{ width: dur ? `${(pos / dur) * 100}%` : '0%' }} />
        </div>
        <span className="text-xs tabular-nums text-slate-300">{fmt(pos)} / {fmt(dur)}</span>
        <span className="flex items-center gap-1 text-[11px] text-amber-300"><Lock size={12} /> ileri sarılamaz</span>
      </div>
    </div>
  );
}
