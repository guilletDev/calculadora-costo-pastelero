'use client';

export function FullPageLoader({ exiting }: { exiting?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-8 bg-[#f9f9ff] transition-opacity duration-500 ${
        exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(233,30,99,0.08), transparent 70%), #f9f9ff' }}
    >
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#b80049]/30 animate-[spin_3s_linear_infinite] motion-reduce:animate-none" />
        <div className="absolute inset-0 rounded-full border border-[#ee2b6c]/40 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite] motion-reduce:animate-none" />
        <img
          src="/icon.svg"
          alt="Costo Repostero"
          width={80}
          height={80}
          className="relative rounded-[20px] shadow-[0_20px_50px_rgba(184,0,73,0.25)] animate-[splash-flip_2s_ease-in-out_infinite] motion-reduce:animate-none"
        />
      </div>
      <div className="text-center">
        <p className="text-2xl font-extrabold tracking-tight text-[#151c27]" style={{ fontFamily: "'Manrope', sans-serif" }}>
          costo repostero
        </p>
        <p className="mt-2 text-sm text-[#5f5e5e] animate-[pulse_2s_ease-in-out_infinite] motion-reduce:animate-none">
          Calculando tus costos…
        </p>
      </div>
    </div>
  );
}