"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icons";

/** Tooltip de ayuda en hover. Render por portal a <body> con posición fija:
 *  no lo clippea el overflow de la tabla y aparece debajo del elemento. */
export function Tip({ text, children, className }: { text: string; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.min(Math.max(r.left + r.width / 2, 130), window.innerWidth - 130);
    setPos({ x, y: r.bottom + 6 });
  };
  const hide = () => setPos(null);

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      className={`relative inline-flex items-center ${className ?? ""}`}
    >
      {children}
      {pos && typeof document !== "undefined" &&
        createPortal(
          <span
            style={{ position: "fixed", left: pos.x, top: pos.y, transform: "translateX(-50%)", zIndex: 9999 }}
            className="pointer-events-none block w-max max-w-[240px] whitespace-normal rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-200 shadow-xl"
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}

/** Ícono "?" con tooltip, para encabezados de columna. */
export function HelpDot({ text }: { text: string }) {
  return (
    <Tip text={text} className="cursor-help text-zinc-600 hover:text-zinc-400">
      <Icon name="help" size={11} />
    </Tip>
  );
}
