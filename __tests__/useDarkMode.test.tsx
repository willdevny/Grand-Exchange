import { renderHook, act } from '@testing-library/react'
import { useDarkMode } from '@/app/hooks/useDarkMode'

describe('useDarkMode', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })

  it('initializes from localStorage when dark mode is enabled', () => {
    localStorage.setItem('darkMode', 'true')
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.enabled).toBe(true)
  })

  it('toggles dark mode state and updates localStorage', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(result.current.enabled).toBe(true)
    expect(localStorage.getItem('darkMode')).toBe('true')
  })

  it('adds the dark class to the document element when enabled', () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => result.current.toggle())
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
