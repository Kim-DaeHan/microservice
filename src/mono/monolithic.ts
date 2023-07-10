export interface Packet {
  key: any
  errorCode: number
  errorMessage: string
}

export interface goodsType {
  key?: any
  id?: number
  name?: string
  category?: string
  price?: number
  description?: string
}

export interface membersType {
  key?: any
  id?: number
  username?: string
  password?: string
}

export interface purchasesType {
  key?: any
  id?: number
  userid?: number
  goodsid?: number
  date?: Date
}
