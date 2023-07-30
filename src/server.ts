import * as net from 'net'
import tcpClient from './client'

// const net = require('net')
class tcpServer {
  private context: {
    port: number
    name: string
    urls: string[]
  }
  private merge: { [key: string]: string }
  private server: net.Server
  private clientDistributor: tcpClient

  constructor(name: string, port: number, urls: string[]) {
    this.context = {
      port: port,
      name: name,
      urls: urls,
    }
    this.merge = {}

    // 서버 객체 생성
    this.server = net.createServer((socket) => {
      // 클라이언트 접속 이벤트
      this.onCreate(socket)

      // 에러 이벤트
      socket.on('error', (exception) => {
        this.onClose(socket)
      })

      // 클라이언트 접속 종료 이벤트
      socket.on('close', () => {
        this.onClose(socket)
      })

      // 데이터 수신 이벤트
      socket.on('data', (data) => {
        const key = `${socket.remoteAddress}:${socket.remotePort}`
        const sz = this.merge[key] ? this.merge[key] + data.toString() : data.toString()
        const arr = sz.split('$')
        for (let n in arr) {
          const index = parseInt(n, 10) // 10은 기수를 나타내며, 10진수로 변환하려는 경우 사용

          if (sz.charAt(sz.length - 1) !== '$' && index === arr.length - 1) {
            this.merge[key] = arr[index]
            break
          } else if (arr[index] === '') {
            break
          } else {
            this.onRead(socket, JSON.parse(arr[index]))
          }
        }
      })
    })

    // 서버 객체 에러 이벤트
    this.server.on('error', (err) => {
      console.log('err: ', err)
    })

    // 리슨
    this.server.listen(port, () => {
      console.log('listen', this.server.address())
    })
  }

  public onCreate(socket: net.Socket) {
    console.log('onCreate', socket.remoteAddress, socket.remotePort)
  }

  public onClose(socket: net.Socket) {
    console.log('onClose', socket.remoteAddress, socket.remotePort)
  }

  public onRead(socket: net.Socket, data: any) {
    console.log('onRead:', socket, data)
  }

  // Distributor 접속 함수
  public connectToDistributor(host: string, port: number, onNoti: (data: any) => void) {
    // Distributor 전달 패킷
    const packet = {
      uri: '/distributes',
      method: 'POST',
      key: 0,
      params: this.context,
    }

    let isConnectedDistributor = false

    this.clientDistributor = new tcpClient(
      host,
      port,
      // Distributor 접속 이벤트 onCreate
      (options) => {
        isConnectedDistributor = true
        this.clientDistributor.write(packet)
      },
      // Distributor 데이터 수신 이벤트 onRead
      (options, data) => {
        onNoti(data)
      },
      // Distributor 접속 종료 이벤트 onClose
      (options) => {
        isConnectedDistributor = false
      },
      // Distributor 통신 에러 이벤트 onError
      (options) => {
        isConnectedDistributor = false
      },
    )

    // 주기적으로 재접속 시도
    setInterval(() => {
      if (isConnectedDistributor !== true) {
        this.clientDistributor.connect()
      }
    }, 3000)
  }
}

export default tcpServer
