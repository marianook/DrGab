import { useEffect, useRef, useState } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export default function VoiceInputButton({ onResultado }) {
  const [grabando, setGrabando] = useState(false);
  const reconocimientoRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;
    const reconocimiento = new SpeechRecognitionAPI();
    reconocimiento.lang = 'es-AR';
    reconocimiento.interimResults = false;
    reconocimiento.continuous = false;

    reconocimiento.onresult = (evento) => {
      const texto = Array.from(evento.results)
        .map((r) => r[0].transcript)
        .join(' ');
      onResultado(texto);
    };
    reconocimiento.onend = () => setGrabando(false);
    reconocimiento.onerror = () => setGrabando(false);

    reconocimientoRef.current = reconocimiento;
    return () => reconocimiento.abort();
  }, [onResultado]);

  if (!SpeechRecognitionAPI) return null;

  const alternar = () => {
    if (grabando) {
      reconocimientoRef.current.stop();
      setGrabando(false);
    } else {
      reconocimientoRef.current.start();
      setGrabando(true);
    }
  };

  return (
    <button
      type="button"
      className={`btn ${grabando ? 'btn-peligro' : 'btn-ghost'}`}
      onClick={alternar}
      title="Dictar por voz"
      style={{ minHeight: 40, padding: '6px 14px', fontSize: 14 }}
    >
      {grabando ? '⏹ Grabando…' : '🎤 Dictar'}
    </button>
  );
}
