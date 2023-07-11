import * as http from 'http'
import * as url from 'url'
import * as querystring from 'querystring'
import tcpClient from './client'

interface ClientInfo {
  client: tcpClient
  info: NodeInfo
}

interface NodeInfo {
  host: string
  port: number
  name: string
  urls: string[]
}

const mapClients: Record<string, ClientInfo> = {}
const mapUrls: Record<string, tcpClient[]> = {}
const mapResponse: Record<number, http.ServerResponse> = {}
const mapRR: Record<string, number> = {}
let index = 0

// HTTP 서버 만듬
const server = http
  .createServer((req, res) => {
    const method = req.method
    const uri = url.parse(req.url!, true)
    const pathname = uri.pathname!

    if (method === 'POST' || method === 'PUT') {
      let body = ''

      req.on('data', function (data) {
        body += data
      })

      req.on('end', function () {
        let params
        if (req.headers['content-type'] === 'application/json') {
          params = JSON.parse(body)
        } else {
          params = querystring.parse(body)
        }

        onRequest(res, method, pathname, params)
      })
    } else {
      onRequest(res, method, pathname, uri.query)
    }
  })
  .listen(8000, () => {
    console.log('listen', server.address())

    const packet = {
      uri: '/distributes',
      method: 'POST',
      key: 0,
      params: {
        port: 8000,
        name: 'gate',
        urls: [] as string[],
      },
    }

    let isConnectedDistributor = false

    const clientDistributor = new tcpClient(
      '127.0.0.1',
      9000,
      // 접속 이벤트
      (options) => {
        isConnectedDistributor = true
        clientDistributor.write(packet)
      },
      // 데이터 수신 이벤트
      (options, data) => {
        onDistribute(data)
      },
      // 접속 종료 이벤트
      (options) => {
        isConnectedDistributor = false
      },
      // 에러 이벤트
      (options) => {
        isConnectedDistributor = false
      },
    )

    // 주기적인 Distributor 접속 상태 확인
    setInterval(() => {
      if (!isConnectedDistributor) {
        clientDistributor.connect()
      }
    }, 3000)
  })

// API 호출 처리
function onRequest(res: http.ServerResponse, method: string, pathname: string, params: any) {
  const key = method + pathname
  const client = mapUrls[key]

  if (client === undefined) {
    res.writeHead(404)
    res.end()
    return
  } else {
    // API 호출에 대한 고유키 값 설정
    params.key = index
    const packet = {
      uri: pathname,
      method: method,
      params: params,
    }

    mapResponse[index] = res
    index++

    // 라운드 로빈 처리
    if (mapRR[key] === undefined) {
      mapRR[key] = 0
    }

    mapRR[key]++

    client[mapRR[key] % client.length].write(packet)
  }
}

// Distributor 접속 처리
function onDistribute(data: Buffer) {
  const parsedData: { params: NodeInfo[] } = JSON.parse(data.toString())

  for (const node of parsedData.params) {
    const key = `${node.host}:${node.port}`

    if (!(key in mapClients) && node.name !== 'gate') {
      const client = new tcpClient(node.host, node.port, onCreateClient, onReadClient, onEndClient, onErrorClient)

      mapClients[key] = {
        client: client,
        info: node,
      }

      for (const urlKey of node.urls) {
        if (!(urlKey in mapUrls)) {
          mapUrls[urlKey] = []
        }
        mapUrls[urlKey].push(client)
      }

      client.connect()
    }
  }
}

// 마이크로서비스 접속 이벤트 처리
function onCreateClient(options: any) {
  console.log('onCreateClient')
}

// 마이크로서비스 응답 처리
function onReadClient(options: any, packet: any) {
  console.log('onReadClient', packet)
  mapResponse[packet.key].writeHead(200, { 'Content-Type': 'application/json' })
  mapResponse[packet.key].end(JSON.stringify(packet))
  delete mapResponse[packet.key]
}

// 마이크로서비스 접속 종료 처리
function onEndClient(options: any) {
  const key = options.host + ':' + options.port
  console.log('onEndClient', mapClients[key])
  for (let n in mapClients[key].info.urls) {
    const node = mapClients[key].info.urls[n]
    delete mapUrls[node]
  }
  delete mapClients[key]
}

function onErrorClient(options: any) {
  console.log('onErrorClient')
}
