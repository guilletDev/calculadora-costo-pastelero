import { formatCurrency } from '@/lib/cost';

export interface PresupuestoTicketLine {
  id?: string;
  concepto: string;
  precio: string;
}

interface PresupuestoTicketProps {
  title: string;
  clientName: string;
  lines: PresupuestoTicketLine[];
  total: number;
  deposit: number;
}

// Comprobante para exportar como PNG. Usa estilos inline y colores hex
// explícitos para que html-to-image lo capture igual en cualquier entorno.
export function PresupuestoTicket({
  title,
  clientName,
  lines,
  total,
  deposit,
}: PresupuestoTicketProps) {
  const today = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const visibleLines = lines.filter(
    (line) => line.concepto.trim().length > 0 || (parseFloat(line.precio) || 0) > 0
  );

  const balance = Math.max(total - deposit, 0);

  return (
    <div
      style={{
        width: 480,
        background: '#ffffff',
        padding: 32,
        color: '#151c27',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '2px solid #b80049',
          paddingBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg
            width={38}
            height={38}
            viewBox="0 0 960 960"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ display: 'block', flexShrink: 0 }}
          >
            <rect width="960" height="960" fill="#ee2b6c" rx="160" />
            <g transform="translate(480, 480) scale(0.65) translate(-480, 480)">
              <path
                fill="white"
                d="M804-282q17 9 30-4t4-30l-58-108-42 108 66 34Zm-200-38h48l96-238q3-8-1.5-13.5T736-580l-80-32q-9-3-17.5 2T628-596l-24 276Zm-296 0h48l-24-276q-2-11-10.5-15t-17.5-1l-80 32q-8 3-11.5 8.5T212-558l96 238Zm-152 38 66-34-42-108-58 108q-9 17 4 30t30 4Zm280-38h88l30-338q2-9-4.5-15.5T534-680H426q-8 0-14.5 6.5T406-658l30 338ZM138-200q-42 0-70-31.5T40-306q0-12 3.5-23.5T52-352l88-168q-14-40 1-79t53-55l80-32q14-5 28-7t28 1q14-29 39-48.5t57-19.5h108q32 0 57 19.5t39 48.5q14-2 28-.5t28 6.5l80 32q40 16 56 55t-2 77l88 168q6 11 9 23t3 25q0 45-30.5 75.5T814-200q-11 0-22-2.5t-22-7.5l-62-30H250l-56 30q-13 7-27.5 8.5T138-200Zm342-280Z"
              />
            </g>
          </svg>
          <p style={{ margin: 0, fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>
            Costo Repostero
          </p>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#8a8a8a', textAlign: 'right' }}>{today}</p>
      </div>

      {/* Título */}
      <div style={{ textAlign: 'center', margin: '24px 0 8px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#b80049',
          }}
        >
          Presupuesto
        </p>
        {title.trim() && (
          <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 800 }}>{title.trim()}</p>
        )}
        {clientName.trim() && (
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5f5e5e' }}>
            Cliente: {clientName.trim()}
          </p>
        )}
      </div>

      {/* Líneas */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#8a8a8a',
            borderBottom: '1px solid #f0e1e5',
            paddingBottom: 6,
          }}
        >
          <span>Concepto</span>
          <span>Subtotal</span>
        </div>
        {visibleLines.length === 0 ? (
          <p style={{ margin: '16px 0', fontSize: 12, color: '#8a8a8a', textAlign: 'center' }}>
            Sin ítems cargados.
          </p>
        ) : (
          visibleLines.map((line, index) => (
            <div
              key={line.id ?? index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid #f7f1f3',
                fontSize: 13,
              }}
            >
              <span style={{ color: '#151c27' }}>{line.concepto.trim() || 'Sin concepto'}</span>
              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                {formatCurrency(parseFloat(line.precio) || 0)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Totales */}
      <div
        style={{
          marginTop: 18,
          background: '#fdf3f6',
          border: '1px solid #f0cdd8',
          borderRadius: 14,
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#5f5e5e',
            }}
          >
            Total
          </span>
          <span style={{ fontSize: 24, fontWeight: 800, color: '#b80049' }}>
            {formatCurrency(total)}
          </span>
        </div>
        {deposit > 0 && (
          <div
            style={{
              marginTop: 10,
              borderTop: '1px dashed #e4bdc2',
              paddingTop: 10,
              display: 'grid',
              gap: 6,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#5f5e5e',
              }}
            >
              <span>Seña</span>
              <span style={{ fontWeight: 600 }}>- {formatCurrency(deposit)}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              <span>Saldo a abonar</span>
              <span style={{ color: '#b80049' }}>{formatCurrency(balance)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Pie */}
      <p style={{ margin: '18px 0 0', textAlign: 'center', fontSize: 11, color: '#8a8a8a' }}>
        Presupuesto válido por 7 días
      </p>
      <p style={{ margin: '4px 0 0', textAlign: 'center', fontSize: 10, color: '#b8b8b8' }}>
        ¡Gracias por elegirnos!
      </p>
    </div>
  );
}
