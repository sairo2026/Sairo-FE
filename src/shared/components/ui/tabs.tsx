"use client";

import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export type TabItem = { key: string; label: string; panel: ReactNode; isDisabled?: boolean };

export type TabsProps = {
  label: string;
  items: TabItem[];
  activeKey: string;
  onActiveKeyChange: (key: string) => void;
};

/** 좌우 방향키·Home·End로 이동하는 탭. 선택된 탭은 밑줄과 기본 색으로 표시한다. */
export function Tabs({ label, items, activeKey, onActiveKeyChange }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = items.filter((item) => !item.isDisabled);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, key: string) {
    const index = enabled.findIndex((item) => item.key === key);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    if (event.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = enabled.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    onActiveKeyChange(target.key);
    refs.current[target.key]?.focus();
  }

  const active = items.find((item) => item.key === activeKey);
  return (
    <div>
      <div role="tablist" aria-label={label} className="flex gap-6 border-b border-line">
        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <button
              key={item.key}
              ref={(node) => {
                refs.current[item.key] = node;
              }}
              type="button"
              role="tab"
              id={`tab-${item.key}`}
              aria-selected={isActive}
              aria-controls={`panel-${item.key}`}
              tabIndex={isActive ? 0 : -1}
              disabled={item.isDisabled}
              onClick={() => onActiveKeyChange(item.key)}
              onKeyDown={(event) => handleKeyDown(event, item.key)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-body font-semibold transition-colors disabled:cursor-not-allowed disabled:text-ink-3",
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-ink hover:text-primary",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {active ? (
        <div
          role="tabpanel"
          id={`panel-${active.key}`}
          aria-labelledby={`tab-${active.key}`}
          className="pt-6"
        >
          {active.panel}
        </div>
      ) : null}
    </div>
  );
}
