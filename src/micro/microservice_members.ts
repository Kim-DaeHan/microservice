import tcpServer from '../server'
import { Packet } from '../mono/monolithic'
import { Socket } from 'net'

const business = require('../mono/monolithic_members')

class members extends tcpServer {
  constructor() {
    super('members', process.argv[2] ? Number(process.argv[2]) : 9020, [
      'POST/members',
      'GET/members',
      'DELETE/members',
    ])

    this.connectToDistributor('127.0.0.1', 9000, (data: any) => {
      console.log('Distributor Notification', data)
    })
  }

  onRead(socket: Socket, data: any) {
    console.log('onRead', socket.remoteAddress, socket.remotePort, data)
    // 비즈니스 로직 호출
    business.onRequest(socket, data.method, data.uri, data.params, (s: Socket, packet: Packet) => {
      socket.write(JSON.stringify(packet) + '$') // 응답 패킷 전송
    })
  }
}

new members()
