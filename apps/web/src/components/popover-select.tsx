"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { nextOptionIndex, type SelectNavigationKey } from "@/lib/select-navigation";

export type PopoverOption = {value: string; label: string; swatch?: string};

type Props = {
  label: string;
  value: string;
  options: PopoverOption[];
  onChange: (value: string) => void;
  icon?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
};

const navigationKeys = new Set(["ArrowDown","ArrowUp","Home","End"]);

export function PopoverSelect({label,value,options,onChange,icon,disabled=false,compact=false,iconOnly=false,className=""}: Props) {
  const [open,setOpen] = useState(false), [focusIndex,setFocusIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const listboxId = useId(), selectedIndex = Math.max(0,options.findIndex(option => option.value === value));
  const selected = options.find(option => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    setFocusIndex(selectedIndex);
    requestAnimationFrame(() => optionRefs.current[selectedIndex]?.focus());
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown",outside);
    return () => document.removeEventListener("pointerdown",outside);
  },[open,selectedIndex]);

  function move(key: SelectNavigationKey) {
    const next = nextOptionIndex(focusIndex,options.length,key);
    setFocusIndex(next); optionRefs.current[next]?.focus();
  }
  function handleOptionKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (navigationKeys.has(event.key)) { event.preventDefault(); move(event.key as SelectNavigationKey); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    else if (event.key === "Tab") setOpen(false);
  }
  function choose(next: string) { onChange(next); setOpen(false); trigger.current?.focus(); }

  return <div ref={root} className={`popover-select${compact ? " compact" : ""}${iconOnly ? " icon-only" : ""} ${className}`}>
    <button ref={trigger} type="button" className="select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} disabled={disabled}
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setFocusIndex(selectedIndex); setOpen(true); }
        else if (event.key === "Escape") setOpen(false);
      }}>
      {icon}<span className={iconOnly ? "sr-only" : "select-value"}>{selected?.label ?? label}</span><ChevronDown className="select-chevron" size={14} aria-hidden="true"/>
    </button>
    <div id={listboxId} className={`select-popover${open ? " open" : ""}`} role="listbox" aria-label={label} aria-hidden={!open}>
      {options.map((option,index) => <button key={option.value} ref={node => {optionRefs.current[index]=node;}} type="button" role="option" aria-selected={option.value === value} tabIndex={open ? -1 : -1}
        className="select-option" onFocus={() => setFocusIndex(index)} onKeyDown={handleOptionKey} onClick={() => choose(option.value)}>
        {option.swatch && <span className="select-swatch" style={{backgroundColor:option.swatch}} aria-hidden="true"/>}
        <span>{option.label}</span><Check className="select-check" size={16} aria-hidden="true"/>
      </button>)}
    </div>
  </div>;
}
