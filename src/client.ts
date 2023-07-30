import { Socket } from 'net'
import * as net from 'net'

/**
 * tcpClient 클래스
 */
class tcpClient {
  private options: net.NetConnectOpts
  private client: Socket | null
  private merge: string | null
  private onCreate: (options: net.NetConnectOpts) => void
  private onRead: (options: net.NetConnectOpts, data: Buffer) => void
  private onEnd: (options: net.NetConnectOpts) => void
  private onError: (options: net.NetConnectOpts, error: Error) => void

  /**
   * 생성자
   * @param host
   * @param port
   * @param onCreate
   * @param onRead
   * @param onEnd
   * @param onError
   */
  constructor(
    host: string,
    port: number,
    onCreate: (options: net.NetConnectOpts) => void,
    onRead: (options: net.NetConnectOpts, data: Buffer) => void,
    onEnd: (options: net.NetConnectOpts) => void,
    onError: (options: net.NetConnectOpts, error: Error) => void,
  ) {
    this.options = {
      host: host,
      port: port,
    }
    this.client = null
    this.merge = null
    this.onCreate = onCreate
    this.onRead = onRead
    this.onEnd = onEnd
    this.onError = onError
  }

  /**
   * 접속 함수
   */
  connect() {
    this.client = net.connect(this.options, () => {
      if (this.onCreate) {
        this.onCreate(this.options)
      }
    })

    // 데이터 수신 처리
    this.client.on('data', (data: Buffer) => {
      const sz = this.merge ? this.merge + data.toString() : data.toString()
      const arr = sz.split('$')
      for (let n in arr) {
        const index = parseInt(n, 10) // 10은 기수를 나타내며, 10진수로 변환하려는 경우 사용

        if (sz.charAt(sz.length - 1) !== '$' && index === arr.length - 1) {
          this.merge = arr[index]
          break
        } else if (arr[index] === '') {
          break
        } else {
          this.onRead(this.options, JSON.parse(arr[index]))
        }
      }
    })

    // 접속 종료 처리
    this.client.on('close', () => {
      if (this.onEnd) {
        this.onEnd(this.options)
      }
    })

    // 에러 처리
    this.client.on('error', (err: Error) => {
      if (this.onError) {
        this.onError(this.options, err)
      }
    })
  }

  /**
   * 데이터 발송
   * @param packet
   */
  write(packet: any) {
    if (this.client) {
      this.client.write(JSON.stringify(packet) + '$')
    }
  }
}

export default tcpClient
