import React, { useEffect, useRef, useState } from 'react';
import { Eraser, PenLine, Save } from 'lucide-react';
import { Button } from '../ui';

interface SignaturePadProps {
  filename: string;
  onSave: (file: File) => void;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ filename, onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const prepareCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 2.25;
    context.strokeStyle = '#18233b';
  };

  useEffect(() => {
    prepareCanvas();
  }, []);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const context = event.currentTarget.getContext('2d');
    const current = point(event);
    context?.beginPath();
    context?.moveTo(current.x, current.y);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const context = event.currentTarget.getContext('2d');
    const current = point(event);
    context?.lineTo(current.x, current.y);
    context?.stroke();
    setHasInk(true);
  };

  const stop = () => {
    drawingRef.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  const save = () => {
    canvasRef.current?.toBlob(blob => {
      if (blob) onSave(new File([blob], filename, { type: 'image/png' }));
    }, 'image/png');
  };

  return (
    <div className="rounded-xl border border-divider bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone"><PenLine className="h-4 w-4" /> Tanda tangan di area berikut</span>
        <Button type="button" variant="ghost" size="sm" onClick={clear} icon={<Eraser className="h-3.5 w-3.5" />}>Bersihkan</Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-40 w-full touch-none rounded-lg border border-dashed border-primary-blue/30 bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
        aria-label="Area tanda tangan digital"
      />
      <Button type="button" className="mt-3" size="sm" disabled={!hasInk} onClick={save} icon={<Save className="h-4 w-4" />}>Gunakan tanda tangan</Button>
    </div>
  );
};

export default SignaturePad;
