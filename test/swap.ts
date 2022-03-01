import { ChainId, Token, TokenAmount, TradeType } from "@uniswap/sdk"
import { Route, Trade, Pair } from "@uniswap/v2-sdk"

{
//   Percentage,
// }

export function calculateEntryForPosition(
  poolState: { a: number; b: number },
  percentage: number,
  step: number = 0.1,
  opts?: { percentageOnWithdraw: number }
): { res: SupplyAfter; amountToSwap: number; N: number } | null {
  const currentPrice = poolState.b / poolState.a

  let target = currentPrice * percentage
  target += currentPrice

  if (opts === undefined) {
    return determinePricePush(poolState, target, currentPrice, step)
  } else {
    const percentageOnWithdraw = opts.percentageOnWithdraw

    const newState = {
      a: poolState.a * (1 - percentageOnWithdraw),
      b: poolState.b * (1 - percentageOnWithdraw),
    }

    return determinePricePush(newState, target, currentPrice, step)
  }
}

export function deferDeterminePricePush(
  initial: { a: number; b: number },
  target: number,
  step: number
): { res: SupplyAfter; amountToSwap: number; N: number; op: 0 | 1 } | null {
  return determinePricePush(initial, target, initial.b / initial.a, step)
}


export function determinePricePush(
  initial: { a: number; b: number },
  target: number,
  currentPrice: number,
  step: number
): { res: SupplyAfter; amountToSwap: number; N: number; op: 0 | 1 } | null {
  let amountToSwap = 0.1
  let lastRes = null

  if (currentPrice === target) {
    return null
  }

  let i = 0
  if (target > currentPrice) {
    // pump
    while (true) {
      i++
      const res = supplyAfterA(amountToSwap, initial.a, initial.b)
      // const res = swapFn(amountToSwap, initial.a, initial.b)
      amountToSwap += step

      if (lastRes === null) {
        lastRes = res
        continue
      }

      const lastResPrice = priceBAFromRes(lastRes)
      const resPrice = priceBAFromRes(res)

      if (lastResPrice < target && resPrice >= target) {
        // lastRes = res
        // break
        return { res, amountToSwap, N: i, op: 0 }
      }
    }
    // dump
  } else {
    while (true) {
      i++
      const res = supplyAfterB(amountToSwap, initial.a, initial.b)
      amountToSwap += step

      if (lastRes === null) {
        lastRes = res
        continue
      }

      const lastResPrice = priceBAFromRes(lastRes)
      const resPrice = priceBAFromRes(res)

      if (lastResPrice > target && resPrice <= target) {
        // lastRes = res
        // break
        return { res, amountToSwap, N: i, op: 1 }
      }
    }
  }
}

export const percentage = (a: number, b: number) => {
  const calc = () => (a < b ? a / b : b / a)
  return 1 - calc()
}
