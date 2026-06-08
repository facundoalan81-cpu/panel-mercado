"use client";

import { Icon } from "./Icons";

/** Tooltip de ayuda en hover. Envuelve cualquier contenido. */
export function Tip({ text, children, className }: { text: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={`group/tip relative inline-flex items-center ${className ?? ""}`}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-[70] mb-1.5 hidden -translate-x-1/2 group-hover/tip:block">
        <span className="block w-max max-w-[230px] whitespace-normal rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-zinc-300 shadow-xl">
          {text}
        </span>
      </span>
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
