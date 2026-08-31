const { handleApi, readNodeBody } = require("../lib/handler");

module.exports = async function handler(req, res) {
  try {
    const host = req.headers.host || "localhost";
    const url = new URL(req.url, "http://" + host);
    let rawBody = req.body;
    if (rawBody == null && req.method !== "GET" && req.method !== "HEAD") {
      rawBody = await readNodeBody(req);
    }
    const result = await handleApi({
      method: req.method,
      pathname: url.pathname,
      searchParams: url.searchParams,
      headers: req.headers,
      rawBody,
    });
    res.statusCode = result.status;
    for (const [k, v] of Object.entries(result.headers || {})) res.setHeader(k, v);
    res.end(result.body);
  } catch (err) {
    console.error(err);
    res.statusCode = err.message === "too_large" ? 413 : 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: err.message === "too_large" ? "Request too large" : "Server error" }));
  }
};
