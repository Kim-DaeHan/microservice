import { Socket } from 'net'
import { Packet, goodsType } from './monolithic'

const mysql = require('mysql') // mysql 확장 모듈 참조

// 데이터베이스 접속 정보
const conn = {
  host: 'localhost',
  user: 'micro',
  password: 'service',
  database: 'monolithic',
}

/**
 * 상품 관리의 각 기능별로 분기
 */
exports.onRequest = function (
  res: Socket,
  method: string,
  pathName: string,
  params: goodsType,
  cb: (res: Socket, packet: Packet) => void,
) {
  switch (method) {
    case 'POST':
      return register(method, pathName, params, (response: Packet) => {
        process.nextTick(cb, res, response)
      })
    case 'GET':
      return inquiry(method, pathName, params, (response: Packet) => {
        process.nextTick(cb, res, response)
      })
    case 'DELETE':
      return unregister(method, pathName, params, (response: Packet) => {
        process.nextTick(cb, res, response)
      })
    default:
      return process.nextTick(cb, res, null) // 정의되지 않은 메서드면 null 리턴
  }
}

/**
 * 상품 등록 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function register(method: string, pathName: string, params: goodsType, cb: (response: Packet) => void) {
  let response: Packet = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
  }

  // 유효성 검사
  if (params.name == null || params.category == null || params.price == null || params.description == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'insert into goods(name, category, price, description) values(? ,? ,?, ?)',
      [params.name, params.category, params.price, params.description],
      (error: Error | null, results: any[] | null, fields: Record<string, any>[] | null) => {
        // mysql 에러 처리
        if (error) {
          response.errorCode = 1
          response.errorMessage = error.message
        }
        cb(response)
      },
    )
    connection.end()
  }
}

/**
 * 상품 조회 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function inquiry(method: string, pathName: string, params: goodsType, cb: (response: Packet) => void) {
  let response: Packet & { results: string[] } = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
    results: [],
  }

  const connection = mysql.createConnection(conn)
  connection.connect()
  connection.query(
    'select * from goods',
    (error: Error | null, results: any[] | null, fields: Record<string, any>[] | null) => {
      if (error || results === null || results.length == 0) {
        response.errorCode = 1
        response.errorMessage = error ? error.message : 'no data'
      } else {
        response.results = results
      }
      cb(response)
    },
  )
  connection.end()
}

/**
 * 상품 삭제 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function unregister(method: string, pathName: string, params: goodsType, cb: (response: Packet) => void) {
  let response: Packet = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
  }

  if (params.id == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'delete from goods where id = ?',
      [params.id],
      (error: Error | null, results: any[] | null, fields: Record<string, any>[] | null) => {
        if (error) {
          response.errorCode = 1
          response.errorMessage = error.message
        }
        cb(response)
      },
    )
    connection.end()
  }
}
