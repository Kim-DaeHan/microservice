import { Socket } from 'net'
import { Packet, purchasesType } from './monolithic'

const mysql = require('mysql') // mysql 확장 모듈 참조

// 데이터베이스 접속 정보
const conn = {
  host: 'localhost',
  user: 'micro',
  password: 'service',
  database: 'monolithic',
}

/**
 * 구매 관리의 각 기능별로 분기
 */
exports.onRequest = function (
  res: Socket,
  method: string,
  pathName: string,
  params: purchasesType,
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
    default:
      return process.nextTick(cb, res, null) // 정의되지 않은 메서드면 null 리턴
  }
}

/**
 * 구매 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function register(method: string, pathName: string, params: purchasesType, cb: (response: Packet) => void) {
  let response: Packet = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
  }

  // 유효성 검사
  if (params.userid == null || params.goodsid == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'insert into purchases(userid, goodsid) values(? ,?)',
      [params.userid, params.goodsid],
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
 * 구매 내역 조회 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function inquiry(method: string, pathName: string, params: purchasesType, cb: (response: Packet) => void) {
  let response: Packet & { results: string[] | null } = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
    results: [],
  }

  if (params.userid == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'select id, goodsid, date from purchases where userid = ?',
      [params.userid],
      (error: Error | null, results: any[] | null, fields: Record<string, any>[] | null) => {
        if (error) {
          response.errorCode = 1
          response.errorMessage = error.message
        } else {
          response.results = results
        }
        cb(response)
      },
    )
    connection.end()
  }
}
