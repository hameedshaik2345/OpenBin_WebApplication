const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication requests, please try again later." },
});

const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for QR claims. Please wait before claiming another code." },
});

const withdrawLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded for withdrawals. Please wait a few minutes." },
});

const helmetConfig = helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

module.exports = {
  generalLimiter,
  authLimiter,
  claimLimiter,
  withdrawLimiter,
  helmetConfig,
};
