import express from "express"
import axios from "axios"
import * as cheerio from "cheerio"
import cors from "cors"

const app = express()
app.use(cors())

// ---------- Anti-429 Shield ----------
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36"
]

const cache = new Map()

const sleep = ms => new Promise(r => setTimeout(r, ms))
const randomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

async function fetchWithRetry(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await axios.get(url, {
        headers: {
          "User-Agent": randomUA(),
          "Accept": "text/html",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://www.codechef.com/"
        },
        timeout: 15000
      })
    } catch (e) {
      if (e.response?.status === 429 && i < tries - 1) {
        await sleep(3000 * (i + 1))
      } else throw e
    }
  }
}

// ---------- CODECHEF ----------
app.get("/codechef/:username", async (req, res) => {
  const { username } = req.params

  if (cache.has(username)) return res.json(cache.get(username))

  try {
    const { data: html } = await fetchWithRetry(`https://www.codechef.com/users/${username}`)
    const $ = cheerio.load(html)

    const currentRating = parseInt($(".rating-number").first().text()) || 0
    const highestRating = parseInt($(".rating-header small").text().match(/\d+/)?.[0] || currentRating)
    const stars = $(".rating-star span").length
    const globalRank = parseInt($(".rating-ranks li").first().text().match(/\d+/)?.[0] || 0)
    const countryRank = parseInt($(".rating-ranks li").eq(1).text().match(/\d+/)?.[0] || 0)

    const lastContestName = $(".contest-name a").first().text().trim() || "N/A"
    let lastContestDate = "N/A"
    const contestBlock = $(".contest-name a").first().closest(".contest-name, [class*='contest']")
    const timeSpan = contestBlock.find(".time").first()
    if (timeSpan.length > 0) lastContestDate = timeSpan.text().trim()

    const data = {
      currentRating,
      highestRating,
      stars: `${stars}★`,
      globalRank,
      countryRank,
      lastContestName,
      lastContestDate
    }

    cache.set(username, data)
    setTimeout(() => cache.delete(username), 5 * 60 * 1000) // 5 min cache

    res.json(data)
  } catch {
    res.status(404).json({ error: "User not found" })
  }
})

// ---------- ATCODER ----------
app.get("/atcoder/:username", async (req, res) => {
  const { username } = req.params
  try {
    const { data: html } = await axios.get(`https://atcoder.jp/users/${username}`)
    const $ = cheerio.load(html)
    const rating = parseInt($("#rating").text()) || 0
    res.json({ username, rating })
  } catch {
    res.status(404).json({ error: "User not found" })
  }
})

app.listen(3000, () => console.log("Scraper API running"))
