const { randomUUID } = require("crypto");

function reqId(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const id = incoming && String(incoming).trim() ? String(incoming) : randomUUID();
  req.reqId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

module.exports = reqId;
