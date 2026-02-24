import * as React from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export interface TwoFactorInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  containerClassName?: string;
}

/**
 * Input de 6 dígitos estilo Apple para códigos 2FA.
 * Casillas redondeadas, separadas, con animación de foco.
 */
export const TwoFactorInput = React.forwardRef<HTMLInputElement, TwoFactorInputProps>(
  ({ value, onChange, length = 6, disabled, error, className, containerClassName }, ref) => {
    return (
      <InputOTP
        ref={ref}
        maxLength={length}
        value={value}
        onChange={onChange}
        disabled={disabled}
        containerClassName={cn(
          "flex items-center justify-center gap-2 sm:gap-3",
          containerClassName
        )}
        className={cn("disabled:cursor-not-allowed", className)}
      >
        <InputOTPGroup
          className={cn(
            "flex gap-2 sm:gap-3",
            error && "ring-2 ring-destructive ring-offset-2 rounded-lg"
          )}
        >
          {Array.from({ length }).map((_, i) => (
            <InputOTPSlot
              key={i}
              index={i}
              className={cn(
                "h-12 w-12 sm:h-14 sm:w-14 rounded-xl border-2 text-lg font-semibold",
                "transition-all duration-200",
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                error
                  ? "border-destructive bg-destructive/5"
                  : "border-input bg-background hover:border-muted-foreground/50"
              )}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
    );
  }
);
TwoFactorInput.displayName = "TwoFactorInput";
