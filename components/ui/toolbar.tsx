"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Heading,
  Highlighter,
  Italic,
  Link as LinkIcon,
  Palette,
  Quote,
  Strikethrough,
  Underline
} from "lucide-react";
import { useState, type ComponentType, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

export type ToolbarAction = "bold" | "italic" | "underline" | "strikethrough" | "link" | "heading" | "quote" | "highlight" | "color";
export type ToolbarAlignment = "left" | "center" | "right" | "justify";

type ToolbarButtonProps = {
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  onPress: () => void;
  tooltip: string | null;
  showTooltip: (label: string) => void;
  hideTooltip: () => void;
  className?: string;
};

const TOOLBAR_ACTIONS: Array<{ id: ToolbarAction; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "bold", label: "Bold", icon: Bold },
  { id: "italic", label: "Italic", icon: Italic },
  { id: "underline", label: "Underline", icon: Underline },
  { id: "strikethrough", label: "Strikethrough", icon: Strikethrough },
  { id: "link", label: "Link", icon: LinkIcon },
  { id: "heading", label: "Heading", icon: Heading },
  { id: "quote", label: "Quote", icon: Quote },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "color", label: "Change Color", icon: Palette }
];

const ALIGNMENT_BUTTONS: Array<{ id: ToolbarAlignment; label: string; icon: ComponentType<{ className?: string }> }> = [
  { id: "left", label: "Align Left", icon: AlignLeft },
  { id: "center", label: "Align Center", icon: AlignCenter },
  { id: "right", label: "Align Right", icon: AlignRight },
  { id: "justify", label: "Justify", icon: AlignJustify }
];

const DEFAULT_ACTIONS: ToolbarAction[] = TOOLBAR_ACTIONS.map((action) => action.id);
const PRESET_COLORS = ["#111827", "#2563eb", "#0f766e", "#dc2626", "#7c3aed", "#ea580c"];

function ToolbarButton({
  label,
  icon: Icon,
  isActive,
  onPress,
  tooltip,
  showTooltip,
  hideTooltip,
  className
}: ToolbarButtonProps) {
  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    onPress();
  }

  return (
    <div className="relative" onMouseEnter={() => showTooltip(label)} onMouseLeave={hideTooltip}>
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-foreground focus:outline-none",
          isActive ? "bg-primary/10 text-foreground" : "",
          className
        )}
        aria-label={label}
        onMouseDown={handleMouseDown}
      >
        <Icon className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {tooltip === label ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
          >
            <span className="whitespace-nowrap">{label}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Toolbar({
  className,
  activeButtons,
  defaultActiveButtons = [],
  onAction,
  textAlign,
  defaultTextAlign = "left",
  onTextAlignChange,
  currentColor = "#111827",
  onColorChange,
  availableActions = DEFAULT_ACTIONS,
  showAlignment = true
}: {
  className?: string;
  activeButtons?: ToolbarAction[];
  defaultActiveButtons?: ToolbarAction[];
  onAction?: (action: ToolbarAction) => void;
  textAlign?: ToolbarAlignment;
  defaultTextAlign?: ToolbarAlignment;
  onTextAlignChange?: (alignment: ToolbarAlignment) => void;
  currentColor?: string;
  onColorChange?: (color: string) => void;
  availableActions?: ToolbarAction[];
  showAlignment?: boolean;
}) {
  const [internalActiveButtons, setInternalActiveButtons] = useState<ToolbarAction[]>(defaultActiveButtons);
  const [internalTextAlign, setInternalTextAlign] = useState<ToolbarAlignment>(defaultTextAlign);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const resolvedActiveButtons = activeButtons ?? internalActiveButtons;
  const resolvedTextAlign = textAlign ?? internalTextAlign;
  const actionButtons = TOOLBAR_ACTIONS.filter((action) => availableActions.includes(action.id));
  const showColorButton = availableActions.includes("color");

  function toggleAction(action: ToolbarAction) {
    if (!activeButtons) {
      setInternalActiveButtons((previous) =>
        previous.includes(action) ? previous.filter((entry) => entry !== action) : [...previous, action]
      );
    }
    onAction?.(action);
  }

  function handleAction(action: ToolbarAction) {
    if (action === "color") {
      setPaletteOpen((current) => !current);
      return;
    }
    setPaletteOpen(false);
    toggleAction(action);
  }

  function handleAlignment(alignment: ToolbarAlignment) {
    if (!textAlign) {
      setInternalTextAlign(alignment);
    }
    onTextAlignChange?.(alignment);
    setPaletteOpen(false);
  }

  function handleColor(color: string) {
    if (!activeButtons) {
      setInternalActiveButtons((previous) => (previous.includes("color") ? previous : [...previous, "color"]));
    }
    onColorChange?.(color);
    setPaletteOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.94 }}
        transition={{ type: "spring", damping: 20, stiffness: 320 }}
        className="flex items-center gap-1 rounded-xl border border-border/70 bg-card/95 p-1 shadow-elev2 backdrop-blur-md"
      >
        {actionButtons.map((action, index) => {
          const isDividerBoundary = action.id === "highlight" && index > 0;
          const isColorButton = action.id === "color";

          return (
            <div key={action.id} className="flex items-center gap-1">
              {isDividerBoundary ? <div className="mx-0.5 h-8 w-px bg-border/80" /> : null}
              <ToolbarButton
                label={action.label}
                icon={action.icon}
                isActive={isColorButton ? paletteOpen : resolvedActiveButtons.includes(action.id)}
                onPress={() => handleAction(action.id)}
                tooltip={tooltip}
                showTooltip={setTooltip}
                hideTooltip={() => setTooltip(null)}
                className={isColorButton ? "relative overflow-hidden" : undefined}
              />
            </div>
          );
        })}

        {showColorButton ? (
          <div className="ml-0.5 h-4 w-4 rounded-full border border-border/80" style={{ backgroundColor: currentColor }} aria-hidden="true" />
        ) : null}

        {showAlignment ? <div className="mx-0.5 h-8 w-px bg-border/80" /> : null}

        {showAlignment
          ? ALIGNMENT_BUTTONS.map((button) => (
              <ToolbarButton
                key={button.id}
                label={button.label}
                icon={button.icon}
                isActive={resolvedTextAlign === button.id}
                onPress={() => handleAlignment(button.id)}
                tooltip={tooltip}
                showTooltip={setTooltip}
                hideTooltip={() => setTooltip(null)}
              />
            ))
          : null}
      </motion.div>

      <AnimatePresence>
        {paletteOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute left-1/2 top-full z-10 mt-2 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-3 py-2 shadow-elev2 backdrop-blur-md"
          >
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                  currentColor.toLowerCase() === color.toLowerCase() ? "border-foreground" : "border-border/80"
                )}
                style={{ backgroundColor: color }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleColor(color);
                }}
                aria-label={`Set text color to ${color}`}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
