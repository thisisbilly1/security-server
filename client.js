export class Client {
  constructor(socket, server) {
    this.name = null;

    this.socket = socket;
    this.id = this.socket.id;
    this.address = this.socket.conn.remoteAddress
    // the address will be ::1 if localhost
    console.log('client address', this.socket.conn.remoteAddress)
    this.address = this.address === '::1' ? '127.0.0.1' : this.address;
    this.server = server;
    

    socket.on('disconnect', () => {
      console.log('user disconnected');
      this.server.removeClient(this);
    })

    socket.on('ping', this.handlePing)
    socket.on('camera', this.handleCameraConnection)
    
    console.log('a camera connected', this.address)
  }

  handleCameraConnection(data) {
    console.log('camera connected', data)
    this.name = data.name;
  }
  
  handlePing() {
    this.send('pong')
  }

  send(id, data) {
    this.socket.emit(id, data);
  }
}