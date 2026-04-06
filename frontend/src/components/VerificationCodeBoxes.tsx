import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
};

/**
 * Six single-digit inputs with paste support — same interaction as the sign-up verify screen.
 */
export function VerificationCodeBoxes({
  value,
  onChange,
  disabled,
  autoFocus,
  className,
  inputClassName,
}: Props) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleCodeChange = (index: number, v: string) => {
    if (v && !/^\d$/.test(v)) return;
    const next = [...value];
    next[index] = v;
    onChange(next);
    if (v && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...value];
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i] ?? "";
    }
    onChange(next);
    const nextEmpty = next.findIndex((c) => !c);
    inputRefs.current[nextEmpty !== -1 ? nextEmpty : 5]?.focus();
  };

  return (
    <div className={cn("flex justify-center gap-2", className)}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(e) => handleCodeChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            "h-12 w-11 text-center text-base font-medium tabular-nums rounded-lg border border-input bg-background",
            "shadow-sm transition-[color,box-shadow] outline-none",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            inputClassName
          )}
        />
      ))}
    </div>
  );
}
