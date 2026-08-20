"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface MotionAccordionItem {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export interface MotionAccordionProps {
  items: MotionAccordionItem[];
  /** @default 10 */
  gap?: number;
  className?: string;
  itemClassName?: string;
  allowMultiple?: boolean;
  variant?: "card" | "modern";
  defaultOpenIndex?: number;
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
  itemId,
  panelId,
  itemClassName,
  variant = "card",
}: {
  item: MotionAccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  itemId: string;
  panelId: string;
  itemClassName?: string;
  variant?: "card" | "modern";
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = React.useState(0);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.scrollHeight));
    ro.observe(el);
    setContentH(el.scrollHeight);
    return () => ro.disconnect();
  }, []);

  const isModern = variant === "modern";

  return (
    <motion.div
      layout
      className={cn(
        isModern
          ? "overflow-hidden rounded-2xl transition-colors duration-200"
          : "overflow-hidden rounded-[28px] sm:rounded-[30px] bg-[#f4f4f5] dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/80 text-foreground shadow-xs transition-colors duration-200",
        isModern
          ? isOpen
            ? "bg-[#f4f5f7] dark:bg-slate-800/90"
            : "bg-transparent hover:bg-slate-50/80 dark:hover:bg-slate-900/40"
          : isOpen && "bg-[#ececed] dark:bg-slate-800/90 border-slate-300 dark:border-slate-700",
        itemClassName
      )}
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.9 }}
      animate={isModern ? undefined : { scale: isOpen ? 1 : 0.985 }}
      initial={false}
      style={{ originX: 0.5, originY: 0 }}
    >
      <button
        id={itemId}
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={onToggle}
        className={cn(
          "flex w-full cursor-pointer select-none items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 focus-visible:ring-inset",
          isModern ? "px-5 sm:px-6 py-4 sm:py-5" : "px-6 sm:px-7 py-5"
        )}
      >
        <span
          className={cn(
            isModern
              ? "text-[1.05rem] sm:text-[1.15rem] font-semibold tracking-tight leading-snug text-slate-900 dark:text-slate-100"
              : "text-[clamp(1.1rem,1.5vw,1.3rem)] font-medium tracking-tight leading-snug text-slate-900 dark:text-slate-100"
          )}
        >
          {item.question}
        </span>

        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            rotate: isModern ? (isOpen ? 45 : 0) : isOpen ? 180 : 0,
            scale: isModern ? 1 : isOpen ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          className={cn(
            isModern
              ? "inline-flex size-7 shrink-0 items-center justify-center text-slate-700 dark:text-slate-300"
              : "inline-flex size-10 sm:size-12 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-slate-900 dark:text-slate-100"
          )}
        >
          {isModern ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 1v14M1 8h14" />
            </svg>
          ) : isOpen ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 2"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1h12"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          )}
        </motion.span>
      </button>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={itemId}
        animate={{
          height: isOpen ? contentH : 0,
          opacity: isOpen ? 1 : 0,
        }}
        initial={false}
        transition={{
          height: { type: "spring", stiffness: 340, damping: 34, mass: 0.9 },
          opacity: { duration: 0.2, ease: "easeOut" },
        }}
        style={{ overflow: "hidden" }}
      >
        <motion.div
          ref={contentRef}
          animate={{ y: isOpen ? 0 : -8 }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 30,
            mass: 0.8,
          }}
          className={cn(
            isModern ? "px-5 sm:px-6 pb-5 sm:pb-6 pt-0" : "px-6 sm:px-7 pb-6 sm:pb-7"
          )}
        >
          <div
            className={cn(
              isModern
                ? "text-[0.925rem] sm:text-[0.975rem] leading-relaxed font-normal tracking-normal text-slate-500 dark:text-slate-400"
                : "text-base sm:text-lg leading-7 sm:leading-8 font-normal tracking-normal text-slate-600 dark:text-slate-300"
            )}
          >
            {item.answer}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function MotionAccordion({
  items,
  gap = 10,
  className,
  itemClassName,
  allowMultiple = false,
  variant = "card",
  defaultOpenIndex,
}: MotionAccordionProps) {
  const rawId = React.useId();
  const baseId = `accordion-${rawId.replace(/:/g, "")}`;

  const [openIndexes, setOpenIndexes] = React.useState<number[]>(
    defaultOpenIndex !== undefined ? [defaultOpenIndex] : []
  );

  const toggle = (i: number) => {
    if (allowMultiple) {
      setOpenIndexes((prev) =>
        prev.includes(i) ? prev.filter((idx) => idx !== i) : [...prev, i]
      );
    } else {
      setOpenIndexes((prev) => (prev.includes(i) ? [] : [i]));
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        className={cn(
          "flex flex-col",
          variant === "modern" ? "p-0" : "rounded-[34px] p-2 sm:p-3"
        )}
        style={{ gap: variant === "modern" ? 8 : gap }}
      >
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isOpen={openIndexes.includes(i)}
            onToggle={() => toggle(i)}
            itemId={`${baseId}-trigger-${i}`}
            panelId={`${baseId}-panel-${i}`}
            itemClassName={itemClassName}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}

export default MotionAccordion;
