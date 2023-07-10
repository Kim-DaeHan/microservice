import { Socket } from 'net'
import { Packet, membersType } from './monolithic'

const mysql = require('mysql') // mysql 확장 모듈 참조

// 데이터베이스 접속 정보
const conn = {
  host: 'localhost',
  user: 'micro',
  password: 'service',
  database: 'monolithic',
}

/**
 * 회원 관리의 각 기능별로 분기
 */
exports.onRequest = function (
  res: Socket,
  method: string,
  pathName: string,
  params: membersType,
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
 * 회원 등록 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function register(method: string, pathName: string, params: membersType, cb: (response: Packet) => void) {
  let response: Packet = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
  }

  // 유효성 검사
  if (params.username == null || params.password == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'insert into members(username, password) values(? ,?)',
      [params.username, params.password],
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
 * 회원 인증 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function inquiry(method: string, pathName: string, params: membersType, cb: (response: Packet) => void) {
  let response: Packet & { userid: number } = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
    userid: 0,
  }

  if (params.username == null || params.password == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'select id from members where username = ? and password = ?',
      [params.username, params.password],
      (error: Error | null, results: any[] | null, fields: Record<string, any>[] | null) => {
        if (error || results === null || results.length == 0) {
          response.errorCode = 1
          response.errorMessage = error ? error.message : 'Invalid password'
        } else {
          response.userid = results[0].id
        }
        cb(response)
      },
    )
    connection.end()
  }
}

/**
 * 회원 탈퇴 기능
 * @param method 메서드
 * @param pathName URI
 * @param params 입력 파라미터
 * @param cb 콜백
 */
function unregister(method: string, pathName: string, params: membersType, cb: (response: Packet) => void) {
  let response: Packet = {
    key: params.key,
    errorCode: 0,
    errorMessage: 'success',
  }

  if (params.username == null) {
    response.errorCode = 1
    response.errorMessage = 'Invalid Parameters'
    cb(response)
  } else {
    const connection = mysql.createConnection(conn)
    connection.connect()
    connection.query(
      'delete from members where username = ?',
      [params.username],
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
