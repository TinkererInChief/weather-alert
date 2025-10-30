# DAY 5: Real-Time WebSocket Updates

## GOAL: Live vessel positions + alert notifications with sub-30s latency

---

## MORNING: WebSocket Server Setup (3 hours)

### 1. Install Dependencies

```bash
pnpm add socket.io socket.io-client
pnpm add -D @types/socket.io
```

### 2. Create WebSocket Server

File: `/lib/websocket/server.ts`

```typescript
import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { prisma } from '@/lib/db'

export class WebSocketServer {
  private io: SocketIOServer
  private connectedClients: Map<string, Socket> = new Map()

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      path: '/api/socket'
    })

    this.setupHandlers()
  }

  private setupHandlers() {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WS] Client connected: ${socket.id}`)
      this.connectedClients.set(socket.id, socket)

      // Subscribe to vessel updates
      socket.on('subscribe:vessels', (vesselIds: string[]) => {
        console.log(`[WS] ${socket.id} subscribed to vessels:`, vesselIds)
        vesselIds.forEach(id => socket.join(`vessel:${id}`))
      })

      // Subscribe to fleet updates
      socket.on('subscribe:fleet', (fleetId: string) => {
        console.log(`[WS] ${socket.id} subscribed to fleet:`, fleetId)
        socket.join(`fleet:${fleetId}`)
      })

      // Subscribe to alerts
      socket.on('subscribe:alerts', (userId: string) => {
        console.log(`[WS] ${socket.id} subscribed to alerts for user:`, userId)
        socket.join(`user:${userId}:alerts`)
      })

      // Disconnect
      socket.on('disconnect', () => {
        console.log(`[WS] Client disconnected: ${socket.id}`)
        this.connectedClients.delete(socket.id)
      })
    })
  }

  // Broadcast vessel position update
  broadcastVesselPosition(vesselId: string, position: any) {
    this.io.to(`vessel:${vesselId}`).emit('vessel:position', {
      vesselId,
      position
    })
  }

  // Broadcast fleet update
  broadcastFleetUpdate(fleetId: string, data: any) {
    this.io.to(`fleet:${fleetId}`).emit('fleet:update', data)
  }

  // Broadcast new alert
  broadcastAlert(userId: string, alert: any) {
    this.io.to(`user:${userId}:alerts`).emit('alert:new', alert)
  }

  // Broadcast alert acknowledgment
  broadcastAlertAck(alertId: string, ackData: any) {
    this.io.emit('alert:acknowledged', {
      alertId,
      ...ackData
    })
  }

  // Get connection stats
  getStats() {
    return {
      connectedClients: this.connectedClients.size,
      rooms: this.io.sockets.adapter.rooms.size
    }
  }
}

// Singleton instance
let wsServer: WebSocketServer | null = null

export function initWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  if (!wsServer) {
    wsServer = new WebSocketServer(httpServer)
    console.log('[WS] WebSocket server initialized')
  }
  return wsServer
}

export function getWebSocketServer(): WebSocketServer | null {
  return wsServer
}
```

### 3. Update Next.js Custom Server

File: `/server.js` (CREATE NEW)

```javascript
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { initWebSocketServer } = require('./lib/websocket/server')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  // Initialize WebSocket server
  initWebSocketServer(server)

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/socket`)
  })
})
```

### 4. Update package.json

```json
{
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js"
  }
}
```

---

## AFTERNOON: Client-Side Integration (3 hours)

### 5. Create WebSocket Hook

File: `/lib/hooks/useWebSocket.ts`

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      path: '/api/socket',
      transports: ['websocket', 'polling']
    })

    socketRef.current.on('connect', () => {
      console.log('[WS] Connected')
      setConnected(true)
    })

    socketRef.current.on('disconnect', () => {
      console.log('[WS] Disconnected')
      setConnected(false)
    })

    return () => {
      socketRef.current?.disconnect()
    }
  }, [])

  return {
    socket: socketRef.current,
    connected
  }
}

// Hook for vessel position updates
export function useVesselPositions(vesselIds: string[]) {
  const { socket, connected } = useWebSocket()
  const [positions, setPositions] = useState<Map<string, any>>(new Map())

  useEffect(() => {
    if (!socket || !connected || vesselIds.length === 0) return

    // Subscribe to vessel updates
    socket.emit('subscribe:vessels', vesselIds)

    // Listen for position updates
    socket.on('vessel:position', (data: any) => {
      setPositions(prev => new Map(prev).set(data.vesselId, data.position))
    })

    return () => {
      socket.off('vessel:position')
    }
  }, [socket, connected, vesselIds])

  return positions
}

// Hook for real-time alerts
export function useAlerts(userId: string) {
  const { socket, connected } = useWebSocket()
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    if (!socket || !connected || !userId) return

    // Subscribe to alerts
    socket.emit('subscribe:alerts', userId)

    // Listen for new alerts
    socket.on('alert:new', (alert: any) => {
      setAlerts(prev => [alert, ...prev])
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('New Alert', {
          body: alert.message,
          icon: '/icon-alert.png'
        })
      }
    })

    // Listen for acknowledgments
    socket.on('alert:acknowledged', (data: any) => {
      setAlerts(prev => prev.map(a => 
        a.id === data.alertId ? { ...a, status: 'acknowledged', ...data } : a
      ))
    })

    return () => {
      socket.off('alert:new')
      socket.off('alert:acknowledged')
    }
  }, [socket, connected, userId])

  return alerts
}
```

### 6. Update Dashboard with Real-Time Data

File: `/app/dashboard/page.tsx` (UPDATE)

```typescript
'use client'

import { useVesselPositions, useAlerts } from '@/lib/hooks/useWebSocket'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function Dashboard() {
  const { data: session } = useSession()
  const [fleetVessels, setFleetVessels] = useState<string[]>([])
  
  // Get vessel IDs from user's fleets
  useEffect(() => {
    async function loadFleets() {
      const res = await fetch('/api/fleets')
      const data = await res.json()
      const vesselIds = data.fleets.flatMap((f: any) => 
        f.vessels.map((v: any) => v.vesselId)
      )
      setFleetVessels(vesselIds)
    }
    loadFleets()
  }, [])

  // Subscribe to real-time position updates
  const positions = useVesselPositions(fleetVessels)
  
  // Subscribe to real-time alerts
  const alerts = useAlerts(session?.user?.id || '')

  return (
    <div>
      {/* Connection status indicator */}
      <div className="fixed top-4 right-4">
        <div className="flex items-center gap-2 px-3 py-1 bg-white rounded shadow">
          <div className={`w-2 h-2 rounded-full ${positions.size > 0 ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm">
            Live Updates {positions.size > 0 ? 'Active' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Real-time alerts panel */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Live Alerts</h2>
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert: any) => (
            <div
              key={alert.id}
              className="border p-4 rounded bg-red-50 border-red-200 animate-pulse"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-red-800">
                    {alert.severity.toUpperCase()}
                  </span>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
                {alert.status === 'pending' && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time vessel map */}
      <div className="h-96 border rounded">
        <VesselMap positions={Array.from(positions.values())} />
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="border p-4 rounded">
          <div className="text-2xl font-bold">{positions.size}</div>
          <div className="text-sm text-gray-600">Live Vessels</div>
        </div>
        <div className="border p-4 rounded">
          <div className="text-2xl font-bold">{alerts.filter(a => a.status === 'pending').length}</div>
          <div className="text-sm text-gray-600">Active Alerts</div>
        </div>
      </div>
    </div>
  )
}

async function acknowledgeAlert(alertId: string) {
  await fetch(`/api/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contactId: 'current-user-contact-id' })
  })
}
```

---

## EVENING: Integrate with AIS Stream (2 hours)

### 7. Update AIS Stream Service to Broadcast

File: `/lib/services/ais-stream.ts` (UPDATE)

```typescript
import { getWebSocketServer } from '../websocket/server'

class AISStreamService {
  // ... existing code ...

  async processMessage(message: any) {
    try {
      const { MetaData, Message } = message
      
      // Save to database (existing logic)
      const position = await this.savePosition(...)

      // Broadcast to WebSocket clients
      const wsServer = getWebSocketServer()
      if (wsServer && position) {
        wsServer.broadcastVesselPosition(position.vesselId, {
          latitude: position.latitude,
          longitude: position.longitude,
          speed: position.speed,
          course: position.course,
          timestamp: position.timestamp
        })
      }

      // ... rest of existing code
    } catch (error) {
      console.error('[AIS] Error processing message:', error)
    }
  }
}
```

### 8. Update Alert Routing to Broadcast

File: `/lib/services/alert-routing-service.ts` (UPDATE)

```typescript
import { getWebSocketServer } from '../websocket/server'

export class AlertRoutingService {
  // ... existing code ...

  async createAndRouteAlert(params: any) {
    // ... existing alert creation logic ...

    const alert = await prisma.vesselAlert.create({ ... })

    // Get contacts and send notifications
    const contacts = await this.getContactsForVessel(...)
    
    // ... send notifications ...

    // Broadcast alert to all relevant users via WebSocket
    const wsServer = getWebSocketServer()
    if (wsServer) {
      for (const contact of contacts) {
        wsServer.broadcastAlert(contact.userId, alert)
      }
    }

    return { alert, deliveryLogs, recipientCount: contacts.length }
  }

  async acknowledgeAlert(alertId: string, contactId: string) {
    const alert = await prisma.vesselAlert.update({ ... })

    // Broadcast acknowledgment
    const wsServer = getWebSocketServer()
    if (wsServer) {
      wsServer.broadcastAlertAck(alertId, {
        acknowledgedAt: alert.acknowledgedAt,
        acknowledgedBy: contactId
      })
    }

    return alert
  }
}
```

---

## DAY 5 CHECKLIST

- [ ] socket.io installed
- [ ] WebSocket server created
- [ ] Custom Next.js server with WebSocket support
- [ ] Client-side hooks created (useWebSocket, useVesselPositions, useAlerts)
- [ ] Dashboard updated with real-time data
- [ ] AIS stream broadcasts position updates
- [ ] Alert routing broadcasts new alerts
- [ ] Acknowledgments broadcast in real-time
- [ ] Test: See live vessel movements on dashboard
- [ ] Test: Receive instant alert notifications
- [ ] Test: See acknowledgments update in real-time
- [ ] Browser notifications enabled

**End of Day 5:** Real-time updates with sub-30s latency! ⚡
