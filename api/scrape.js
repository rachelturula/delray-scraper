import fetch from "node-fetch";
import * as cheerio from "cheerio";

export default async function handler(req, res) {
  // --- guardrails -----------------------------------------------------------
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }
  const { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "Missing url" });
  }

  // --- fetch & trim ---------------------------------------------------------
  const MAX = 200 * 1024; // 200 kB hard cap keeps payloads well below action limit
  const raw = await fetch(url, {
    headers: { "User-Agent": "DelRayScraperBot/1.0" }
  })
    .then(r => r.text())
    .catch(() => "");

  const html = raw.length > MAX ? raw.slice(0, MAX) : raw;
  // --------------------------------------------------------------------------

  const $ = cheerio.load(html);

  // --- best-effort field extraction ----------------------------------------
  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text() ||
    $("h1").first().text();

  const rawDate =
    $("time").first().attr("datetime") ||
    $("time").first().text() ||
    $("[class*=date], [class*=time]").first().text();

  const location =
    $("[class*=venue], [class*=location], [itemprop*=location]")
      .first()
      .text();

  const address =
    $("address").first().text() ||
    $("[class*=address]").first().text();

  const summary =
    $("meta[name='description']").attr("content") ||
    $("p").first().text();

  const links = $("a[href]")
    .map((_, el) => $(el).attr("href"))
    .get()
    .filter(href => href && !href.startsWith("#"))
    .slice(0, 20);
  // --------------------------------------------------------------------------

  res.status(200).json({
    html,
    links,
    guess: {
      event_title: title?.trim() || null,
      start: rawDate?.trim() || null,
      end: null,
      location: location?.trim() || null,
      address: address?.trim() || null,
      summary: summary?.trim() || null
    }
  });
}
