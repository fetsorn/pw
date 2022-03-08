import Big from "big.js"
import axios from "axios"
import { ethers } from "hardhat"

const TGBot = require("node-telegram-bot-api")

import { PWPegger__factory } from "~/typechain/factories/PWPegger__factory"

async function main() {
  const [keeperOracle, adminOracle] = await ethers.getSigners()

  // const response = {
  //   config: {
  //     admin: "0xEab9ff1625eD15E88fb2bCdbb4f325AA4742972d",
  //     keeper: "0x548A2b214493290bB45D516f16176Be01dbf1674",
  //     pwpegdonRef: "0x828761B78E22f5A24240d3EFBA04D1f0b25f4EFE",
  //     calibrator: "0xF3ca94706164ca970B649CE72F7e424ad18cd850",
  //     vault: "0x3718eCd4E97f4332F9652D0Ba224f228B55ec543",
  //     pool: "0xcf9f857ffe6ff32b41b2a0d0b4448c16564886de",
  //     token: "0xc1be9a4d5d45beeacae296a7bd5fadbfc14602c4",
  //     // emergencyth: "100000",
  //     // volatilityth: "30000",
  //     // frontrunth: "20000",
  //     emergencyth: "100000000000000000",
  //     volatilityth: "100000000000000000",
  //     frontrunth: "100000000000000000",
  //     decimals: 6,
  //   },
  //   pwpegger: "0xadAf77ED6f310A848dA2542E57Fe26049A30B96c",
  // }

  // replace the value below with the Telegram token you receive from @BotFather
  const token = process.env.TG_TOKEN
  const channel_id = process.env.TG_CHANNEL

  // Create a bot that uses 'polling' to fetch new updates
  const bot = new TGBot(token, { polling: false })

  const pwfactory = (await ethers.getContractFactory(
    "PWPegger"
  )) as PWPegger__factory

  let pwpegger = pwfactory.attach("0x5b57373400B0045c856300F9626d7038f8830195")

  // pwpegger.callIntervention()
  // await pwpegger.connect(adminOracle).updPWConfig(response.config)

  // return
  pwpegger = await pwpegger.connect(keeperOracle)

  const sleep = async (ms: number) =>
    await new Promise((resolve) => setTimeout(resolve, ms))

  while (true) {
    try {
      const basePrice = await axios.get<{ result: number }>("/rpc/base-price", {
        baseURL: "https://pw.gton.capital",
      })

      console.log({ basePrice: basePrice.data.result })

      let currentPriceArg = new Big(basePrice.data.result).mul(1e6).toFixed()
      currentPriceArg = currentPriceArg.slice(0, currentPriceArg.indexOf("."))

      const estimated_callIntervention =
        await pwpegger.estimateGas.callIntervention(currentPriceArg)
      console.log({ estimated_callIntervention })

      const intervention_result = await pwpegger.callIntervention(
        currentPriceArg
      )

      // console.log({ intervention_result: intervention_result.hash })

      const tx_msg = `https://ftmscan.com/tx/${intervention_result.hash}`

      await bot.sendMessage(
        channel_id,
        `callIntervention successfully called\n${tx_msg}`
      )
    } catch (err) {
      const casted_err = err as { error: string }
      const spl = String(casted_err.error).split("\n")
      const formatted_message = spl[0]

      await bot.sendMessage(channel_id, formatted_message)

      // console.log({ spl })
      // const formatted_message = casted_err
      // console.log({
      //   err,
      //   real_error: casted_err.error,
      // })
    }

    await sleep(1000 * 60 * 5)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
