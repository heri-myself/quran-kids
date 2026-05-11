// @ts-ignore – midtrans-client has no official type declarations
import Midtrans from 'midtrans-client'
import { config } from '../config.js'

export const snap = new Midtrans.Snap({
  isProduction: config.MIDTRANS_IS_PRODUCTION,
  serverKey: config.MIDTRANS_SERVER_KEY,
  clientKey: config.MIDTRANS_CLIENT_KEY,
})

export const coreApi = new Midtrans.CoreApi({
  isProduction: config.MIDTRANS_IS_PRODUCTION,
  serverKey: config.MIDTRANS_SERVER_KEY,
  clientKey: config.MIDTRANS_CLIENT_KEY,
})
