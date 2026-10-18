// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/components/table-generator/cell-input.tsx @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react'

interface CellInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string
}

export type CellInputRef = {
  focus: (options?: FocusOptions) => void
}

export const CellInput = forwardRef<CellInputRef, CellInputProps>(
  function CellInput({ value, ...props }: CellInputProps, ref) {
    const inputRef = useRef<HTMLTextAreaElement>(null)
    useImperativeHandle(ref, () => {
      return {
        focus(options) {
          inputRef.current?.setSelectionRange(value.length, value.length)
          inputRef.current?.focus(options)
        },
      }
    })

    useLayoutEffect(() => {
      if (inputRef?.current) {
        inputRef.current.style.height = '1px'
        inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
      }
    }, [value])

    return <textarea {...props} value={value} ref={inputRef} />
  }
)
