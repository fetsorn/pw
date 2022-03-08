import Big from "big.js"

export const valueToDecimaled = (x: number | string, d: number) =>
  new Big(x).mul(Math.pow(10, d)).toFixed().toString()

export const fromDecimaledToValue = (x: string, d: number) =>
  new Big(x).div(Math.pow(10, d)).toString()
