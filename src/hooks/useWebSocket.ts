'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PartySocket from 'partysocket'
import type { ClientMessage, ServerMessage } from '../../party/messages'

export type WSStatus = 'connecting' | 'open' | 'closed' | 'error'

export function useWebSocket(roomId: string, token: string) {
  const [status, setStatus] = useState<WSStatus>('connecting')
  const [lastMessage, setLastMessage] = useState<ServerMessage | null>(null)
  const socketRef = useRef<PartySocket | null>(null)

  useEffect(() => {
    if (!roomId || !token) return

    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? 'localhost:1999'
    const socket = new PartySocket({
      host,
      room: roomId,
    })
    socketRef.current = socket

    socket.addEventListener('open', () => {
      setStatus('open')
      socket.send(JSON.stringify({ type: 'JOIN', payload: { token } }))
    })

    socket.addEventListener('message', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as ServerMessage
        setLastMessage(data)
      } catch {
        // invalid message, drop
      }
    })

    socket.addEventListener('close', () => setStatus('closed'))
    socket.addEventListener('error', () => setStatus('error'))

    return () => {
      socket.close()
    }
  }, [roomId, token])

  const send = useCallback((msg: ClientMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { status, send, lastMessage }
}
