import { Socket } from 'net'
import tcpServer from './server'

// 노드 접속 관리 오브젝트
interface NodeInfo {
  socket: Socket
  info: {
    host: string
  }
}

let map: { [key: string]: NodeInfo } = {}

// Server 클래스 상속
class Distributor extends tcpServer {
  constructor() {
    super('distributor', 9000, ['POST/distributes', 'GET/distributes'])
  }

  // 접속 노드 이벤트 처리
  onCreate(socket: Socket) {
    console.log('onCreate', socket.remoteAddress, socket.remotePort)
    this.sendInfo(socket)
  }

  // 노드 접속 해제 이벤트 처리
  onClose(socket: Socket) {
    const key = `${socket.remoteAddress}:${socket.remotePort}`
    console.log('onClose', socket.remoteAddress, socket.remotePort)
    delete map[key]
    this.sendInfo()
  }

  // 노드 등록 처리
  onRead(socket: Socket, json: any) {
    const key = `${socket.remoteAddress}:${socket.remotePort}`
    console.log('onRead', socket.remoteAddress, socket.remotePort, json)

    if (json.uri === '/distributes' && json.method === 'POST') {
      map[key] = {
        socket: socket,
        info: { host: '' },
      }
      map[key].info = json.params
      map[key].info.host = socket.remoteAddress
      this.sendInfo()
    }
  }

  // 패킷 전송
  write(socket: Socket, packet: any) {
    socket.write(JSON.stringify(packet) + '$')
  }

  // 노드 접속 또는 특정 소켓에 노드 접속 정보 전파
  sendInfo(socket?: Socket) {
    const packet = {
      uri: '/distributes',
      method: 'GET',
      key: 0,
      params: [] as any[],
    }

    for (const n in map) {
      packet.params.push(map[n].info)
    }

    if (socket) {
      this.write(socket, packet)
    } else {
      for (const n in map) {
        this.write(map[n].socket, packet)
      }
    }
  }
}

// distributor 객체 생성
new Distributor()
