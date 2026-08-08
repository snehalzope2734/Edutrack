import { useState, useRef, useEffect } from "react";
import { Sun, Moon, Laptop, ChevronDown } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function ThemeToggle({ compact = false }) {
  const { theme, setTheme, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Laptop },
  ];

  const currentIcon = isDark ? (
    <Moon className="h-4 w-4 text-amber-400 transition-transform duration-300 rotate-0 dark:scale-100" />
  ) : (
    <Sun className="h-4 w-4 text-amber-500 transition-transform duration-300 rotate-0 scale-100" />
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {compact ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          title={`Current theme: ${theme}`}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {currentIcon}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-800 transition-all duration-200"
        >
          <div className="flex items-center gap-2">
            {currentIcon}
            <span className="capitalize">{theme} Theme</span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-36 origin-bottom-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-black/5 dark:border-slate-800 dark:bg-slate-900 dark:shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="space-y-0.5">
            {options.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => {
                    setTheme(option.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150 ${
                    isSelected
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-brand-600 dark:text-brand-400" : "text-slate-400"}`} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
