"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Square, ShieldAlert } from "lucide-react";
import { uiStrings } from "@/lib/chat/ui-strings";
import { cn } from "@/lib/utils";

interface Props {
  sending?: boolean;
  ended?: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

const MAX = 1000;

export function Composer({ sending, ended, onSend, onStop, inputRef }: Props) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const overLimit = value.length > MAX;
  const ready = value.trim().length > 0 && !overLimit && !sending && !ended;

  // Auto-grow up to ~120px, then scroll inside the field.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value, inputRef]);

  const submit = () => {
    if (!ready) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="border-t border-border bg-card px-3 pb-3 pt-2.5">
      <div
        className={cn(
          "rounded-2xl border bg-background transition-colors",
          overLimit ? "border-destructive/60" : focused ? "border-primary/50" : "border-border",
        )}
      >
        <form
          ref={formRef}
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-end gap-1.5 p-1.5"
        >
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={ended ? uiStrings.startNewChat : uiStrings.placeholder}
            disabled={ended}
            rows={1}
            maxLength={MAX + 400}
            aria-label={uiStrings.send}
            dir="auto"
            className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-snug outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60"
          />

          {sending ? (
            <button
              type="button"
              onClick={onStop}
              aria-label={uiStrings.stop}
              title={uiStrings.stop}
              className="btn-sharp flex size-9 shrink-0 items-center justify-center rounded-none bg-muted text-foreground transition-colors hover:bg-muted/70"
            >
              <Square className="size-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!ready}
              aria-label={uiStrings.send}
              title={uiStrings.send}
              className="btn-sharp flex size-9 shrink-0 items-center justify-center rounded-none bg-primary text-primary-foreground transition-all hover:bg-primary/85 disabled:pointer-events-none disabled:opacity-35"
            >
              <Send className="size-4" />
            </button>
          )}
        </form>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
        <p className="flex items-center gap-1 text-[10.5px] leading-tight text-muted-foreground/70">
          <ShieldAlert className="size-3 shrink-0" />
          {uiStrings.privacyHint}
        </p>
        {value.length > MAX * 0.7 && (
          <span
            className={cn(
              "shrink-0 font-mono text-[10.5px]",
              overLimit ? "text-destructive" : "text-muted-foreground/70",
            )}
          >
            {uiStrings.charLimit(value.length, MAX)}
          </span>
        )}
      </div>

      <p className="mt-1 px-1 text-xs leading-tight text-muted-foreground/50">
        Powered by Google Gemini · AI can make mistakes
      </p>
    </div>
  );
}
