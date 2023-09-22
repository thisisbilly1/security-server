import { Server } from 'socket.io'
import { Client } from './client.js'

export class WSServer {
  constructor(httpServer) {
    this.clients = new Map();

    this.server = null;
    this.httpServer = httpServer;
  }

  start() {
    console.log('starting WebSocket server')
    this.server = new Server(this.httpServer, {
      cors: {
        origin: '*',
        // methods: ['GET', 'POST']
      }
    })

    this.server.on('connection', (socket) => {
      const client = new Client(socket, this)
      this.clients.set(socket.id, client)
    })
  }

  removeClient(client) {
    this.clients.delete(client.socket.id)
  }

  sendAll(...args) {
    for (const [id, client] of this.clients) {
      client.send(message)
    }
  }

  sendOther(id, ...args) {
    const client = this.clients.get(id)
    if (!client) throw new Error('Client not found')
    client.send(...args)
  }
}