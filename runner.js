import AsciiTable from 'ascii-table'
import axios from 'axios'
import fs from 'fs'
import { Utils } from './utils.js'

export class Runner {
  eventId = undefined
  challengeId = undefined
  stages = undefined
  cachedChampionshipEvents = undefined
  cachedRecentResultsEvents = undefined
  cachedEventResult = undefined
  clubId
  interval
  discordWebhookUrl
  api

  constructor (config, api) {
    this.api = api
    this.clubId = config.clubId
    this.interval = config.interval
    this.discordWebhookUrl = config.discordWebhookUrl
    const persistentCache = JSON.parse(fs.readFileSync('cache/persistent.json'))
    if (persistentCache) {
      this.cachedEventResult = persistentCache.eventResults
      this.challengeId = persistentCache.challengeId
      this.eventId = persistentCache.eventId
      this.stages = persistentCache.stages
      console.debug('Loaded persistent cache')
    }
  }

  async run() {
    const championship = await this.api.fetchChampionships(this.clubId)
    this.cachedChampionshipEvents = championship[0].events
// fs.writeFileSync('cache/championships.json', JSON.stringify(cachedChampionshipEvents, null, 1))

    const recentResults = await this.api.fetchRecentResults(this.clubId)
    this.cachedRecentResultsEvents = recentResults.championships[0].events
// fs.writeFileSync('cache/recentResults.json', JSON.stringify(cachedRecentResults, null, 1))
    while (true) {
      console.debug('Fetching event results...')
      const activeEvent = this.cachedChampionshipEvents.find(event => Date.parse(event.entryWindow.start) < Date.now() && Date.parse(event.entryWindow.end) > Date.now())
      if (this.challengeId !== activeEvent.id) {
        if (this.challengeId !== undefined) {
          console.log('Active event changed!')
          // TODO publish championship standing
        }
        this.challengeId = activeEvent.id
        const recentResult = this.cachedRecentResultsEvents.find(event => event.challengeId === this.challengeId)
        this.eventId = recentResult.id
        this.stages = `${recentResult.stages.length - 1}`
      }

      const eventResults = await this.api.fetchEventResults({
        // TODO -1 for debug
        eventId: this.eventId - 1,
        stageId: this.stages,
        challengeId: this.challengeId - 1,
      })
      const entries = eventResults.entries
      if (JSON.stringify(this.cachedEventResult) !== JSON.stringify(entries)) {
        // TODO and if entries not empty
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
        axios.post(this.discordWebhookUrl, {
          content: '```' + table.toString() + '```',
        })
      }
      this.cachedEventResult = eventResults.entries
      const persistentCache = {
        eventResults: this.cachedEventResult,
        challengeId: this.challengeId,
        eventId: this.eventId,
        stages: this.stages,
      }
      fs.writeFileSync('cache/persistent.json', JSON.stringify(persistentCache))
      console.debug('Sleeping...')
      await Utils.sleep(this.interval)
    }
  }

}
