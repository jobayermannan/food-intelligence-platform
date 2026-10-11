"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";
import { applyTheme, readTheme, saveTheme, type ThemeName } from "@/lib/theme";
import { PopoverSelect } from "./popover-select";

const themes = [
  {value:"obsidian",label:"Obsidian",swatch:"#d48b50"},
  {value:"midnight",label:"Midnight Blue",swatch:"#8fbce8"},
  {value:"graphite",label:"Soft Graphite",swatch:"#d5d9df"},
];

export function ThemeSelector() {
  const [theme, setTheme] = useState<ThemeName>("obsidian");

  useEffect(() => {
    const saved = readTheme();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function selectTheme(next: ThemeName) {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  }

  return <PopoverSelect className="theme-selector" label="Color theme" value={theme} options={themes} icon={<Palette size={16} aria-hidden="true"/>} iconOnly onChange={next => selectTheme(next as ThemeName)}/>;
}
