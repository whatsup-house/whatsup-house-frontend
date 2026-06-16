import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  requiredMark?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, requiredMark, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-foreground">
            {label}
            {requiredMark && <span className="text-primary"> *</span>}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-input border bg-card text-foreground
            placeholder:text-tag-text
            focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
            ${error ? 'border-primary' : 'border-tag-bg'}
            ${className ?? ''}`}
          {...props}
        />
        {error && (
          <p className="text-xs text-primary">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
