'use client'

export function BackgroundGradient(): JSX.Element {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-sky-50 to-teal-50 bg-[length:400%_400%] animate-gradient-shift opacity-40" />
  )
}
