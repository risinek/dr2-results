import 'dotenv/config'
import axios from 'axios'
import fs from 'fs'
import { fetchChampionships, fetchEventResults, fetchRecentResults } from './dirt_api.js'
import AsciiTable from 'ascii-table'

const config = {
  clubId: process.env.CLUB_ID,
  interval: process.env.INTERVAL,
  discordWebhookUrl: process.env.DC_WEBHOOK,
}
let eventId = undefined
let challengeId = undefined
let stages = undefined
let cachedChampionshipEvents = undefined
let cachedRecentResultsEvents = undefined
let cachedEventResult = undefined

const persistentCache = JSON.parse(fs.readFileSync('cache/persistent.json'))
if (persistentCache) {
  cachedEventResult = persistentCache.eventResults
  challengeId = persistentCache.challengeId
  eventId = persistentCache.eventId
  stages = persistentCache.stages
  console.debug('Loaded persistent cache')
}

const championship = await fetchChampionships(config.clubId)
cachedChampionshipEvents = championship[0].events
// fs.writeFileSync('cache/championships.json', JSON.stringify(cachedChampionshipEvents, null, 1))

const recentResults = await fetchRecentResults(config.clubId)
cachedRecentResultsEvents = recentResults.championships[0].events
// fs.writeFileSync('cache/recentResults.json', JSON.stringify(cachedRecentResults, null, 1))

while (true) {
  console.debug('Fetching event results...')
  const activeEvent = cachedChampionshipEvents.find(event => Date.parse(event.entryWindow.start) < Date.now() && Date.parse(event.entryWindow.end) > Date.now())
  if (challengeId !== activeEvent.id) {
    if (challengeId !== undefined) {
      console.log('Active event changed!')
      // TODO publish championship standing
    }
    challengeId = activeEvent.id
    const recentResult = cachedRecentResultsEvents.find(event => event.challengeId === challengeId)
    eventId = recentResult.id
    stages = `${recentResult.stages.length - 1}`
  }

  const eventResults = await fetchEventResults({
    eventId: eventId,
    stageId: stages,
    challengeId: challengeId,
  })
  const entries = eventResults.entries
  if (JSON.stringify(cachedEventResult) !== JSON.stringify(entries)) {
    console.log('Event results changed!')
    // TODO publish event results
    const table = new AsciiTable()
    table
      .setHeading('Rank', 'Name', 'Total', 'Diff')
      .setAlign(2, AsciiTable.RIGHT)
      .setAlign(3, AsciiTable.RIGHT)
    for (const entry of entries) {
      table.addRow(entry.rank, entry.name, entry.totalTime, entry.totalDiff)
    }
    axios.post(config.discordWebhookUrl, {
      content: '```' + table.toString() + '```',
    })
  }
  cachedEventResult = eventResults.entries
  const persistentCache = {
    eventResults: cachedEventResult,
    challengeId: challengeId,
    eventId: eventId,
    stages: stages,
  }
  fs.writeFileSync('cache/persistent.json', JSON.stringify(persistentCache))
  console.debug('Sleeping...')
  await sleep(config.interval)
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
