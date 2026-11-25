// GET /api/health — repond « ok » : sert a verifier que l'API est deployee.
const { app } = require("@azure/functions");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async () => ({ status: 200, body: "ok", headers: { "cache-control": "no-store" } }),
});
