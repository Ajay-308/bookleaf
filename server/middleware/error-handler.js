export function errorHandler(error, _req, res, _next) {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." });
  }
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body exceeds the 16 KB limit." });
  }
  console.error("Unhandled request error:", error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}
