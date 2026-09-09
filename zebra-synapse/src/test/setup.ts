import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
window.ResizeObserver = MockResizeObserver as any

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
window.IntersectionObserver = MockIntersectionObserver as any

// Mock window.scrollTo
window.scrollTo = vi.fn()

// Mock HTMLMediaElement play & pause
HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
HTMLMediaElement.prototype.pause = vi.fn()


// Mock HTMLCanvasElement getContext
HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: [] })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => []),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  fillText: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  createRadialGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
})) as any
HTMLCanvasElement.prototype.captureStream = vi.fn(() => new (globalThis.MediaStream as any)()) as any


// Mock localStorage
const localStorageStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = String(value)
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key]
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k])
  }),
  key: vi.fn((idx: number) => Object.keys(localStorageStore)[idx] ?? null),
  get length() {
    return Object.keys(localStorageStore).length
  },
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

import React from 'react'

// Mock recharts ResponsiveContainer to prevent size warnings in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { style: { width: 600, height: 300 } }, children),
  }
})

// Mock URL.createObjectURL
if (!window.URL.createObjectURL) {
  window.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  window.URL.revokeObjectURL = vi.fn()
}

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn()

// Mock MediaStream
class MockMediaStream {
  getTracks = vi.fn(() => [])
  getVideoTracks = vi.fn(() => [])
  getAudioTracks = vi.fn(() => [])
  addTrack = vi.fn()
  removeTrack = vi.fn()
}
globalThis.MediaStream = MockMediaStream as any
;(window as any).MediaStream = MockMediaStream as any

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string
  onmessage: any = null
  constructor(name: string) {
    this.name = name
  }
  postMessage = vi.fn()
  close = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}
globalThis.BroadcastChannel = MockBroadcastChannel as any
;(window as any).BroadcastChannel = MockBroadcastChannel as any

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: '' })
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: '' })
  setLocalDescription = vi.fn().mockResolvedValue(undefined)
  setRemoteDescription = vi.fn().mockResolvedValue(undefined)
  addTrack = vi.fn()
  addIceCandidate = vi.fn().mockResolvedValue(undefined)
  close = vi.fn()
  onicecandidate = null
  ontrack = null
  onconnectionstatechange = null
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}
globalThis.RTCPeerConnection = MockRTCPeerConnection as any
;(window as any).RTCPeerConnection = MockRTCPeerConnection as any


