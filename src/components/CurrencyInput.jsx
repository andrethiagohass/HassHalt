import React from 'react'

function toCents(value) {
  if (value === '' || value === null || value === undefined) return null
  return Math.round(parseFloat(value) * 100)
}

function formatDisplay(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CurrencyInput({ value, onChange, className, placeholder = '0,00', ...props }) {
  function handleChange(e) {
    const digits = e.target.value.replace(/\D/g, '')
    if (!digits) {
      onChange('')
      return
    }
    const cents = parseInt(digits, 10)
    onChange((cents / 100).toFixed(2))
  }

  const cents = toCents(value)
  const displayValue = cents === null ? '' : formatDisplay(cents)

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
    />
  )
}
