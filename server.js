import express from "express"
import axios from "axios"
import * as cheerio from "cheerio"
import cors from "cors"


const app = express()
app.use(cors())

app.get("/codechef/:username", async (req, res) => {
  const { username } = req.params

  try {
    const { data: html } = await axios.get(`https://www.codechef.com/users/${username}`, {
      headers: { "User-Agent": "Mozilla/5.0" }
    })

    const $ = cheerio.load(html)

    const currentRating = parseInt($(".rating-number").first().text()) || 0

    const highestRating =
      parseInt($(".rating-header small").text().match(/\d+/)?.[0] || currentRating)

    const stars = $(".rating-star span").length

    const globalRank =
      parseInt($(".rating-ranks li").first().text().match(/\d+/)?.[0] || 0)

    const countryRank =
      parseInt($(".rating-ranks li").eq(1).text().match(/\d+/)?.[0] || 0)

    const lastContestName =
      $(".contest-name a").first().text().trim() || "N/A"
      // Try to extract contest date
    let lastContestDate = "N/A"
    const contestBlock = $(".contest-name a").first().closest(".contest-name, [class*='contest']")
    const timeSpan = contestBlock.find(".time").first()
    if (timeSpan.length > 0) lastContestDate = timeSpan.text().trim()
    res.json({
      currentRating,
      highestRating,
      stars: `${stars}★`,
      globalRank,
      countryRank,
      lastContestName,
      lastContestDate
    })
  } catch {
    res.status(404).json({ error: "User not found" })
  }
})
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
