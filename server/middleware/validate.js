export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = source === "query"
        ? "Invalid ticket filter."
        : result.error.issues[0]?.message || "Check the submitted details.";
      return res.status(400).json({ error: message });
    }
    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };
}
