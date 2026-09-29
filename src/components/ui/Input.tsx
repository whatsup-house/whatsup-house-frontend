import { forwardRef, useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  requiredMark?: boolean
  labelClassName?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, requiredMark, className, labelClassName, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className={labelClassName ?? 'text-sm font-medium text-foreground'}>
            {label}
            {requiredMark && <span className="text-primary"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-4 py-3 rounded-input border bg-card text-foreground
            placeholder:text-tag-text
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            ${error ? 'border-primary' : 'border-tag-bg'}
            ${className ?? ''}`}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="text-xs text-primary">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
