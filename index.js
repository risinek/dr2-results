import 'dotenv/config'
import { Runner } from './runner.js'
import { DirtApi } from './dirt_api.js'

const config = {
  clubId: process.env.CLUB_ID,
  interval: process.env.INTERVAL,
  discordWebhookUrl: process.env.DC_WEBHOOK,
}

const api = new DirtApi()
const runner = new Runner(config, api)
await runner.run()
