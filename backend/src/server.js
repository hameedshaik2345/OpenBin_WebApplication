require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const socketConfig = require("./config/socket");
const { firebaseConfig } = require("./config/firebase");
const { migrate } = require("./db/migrate");
const { startExpiryWorker } = require("./workers/expiryWorker");

const authRoutes = require("./routes/authRoutes");
const rvmRoutes = require("./routes/rvmRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const accountRoutes = require("./routes/accountRoutes");
const catalogRoutes = require("./routes/catalogRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const server = http.createServer(app);
const io = socketConfig.init(server, {
  origin: CLIENT_ORIGIN,
  credentials: true,
});

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    firebaseProject: firebaseConfig.projectId,
    databaseURL: firebaseConfig.databaseURL || null,
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/rvms", rvmRoutes);
app.use("/api/rvm", deviceRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/catalog", catalogRoutes);

async function start() {
  try {
    await migrate();
    console.log("PostgreSQL migrations ready");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }

  startExpiryWorker();

  const rtdbService = require("./services/rtdbService");
  io.on("connection", (socket) => {
    console.log("Socket client connected:", socket.id);
    rtdbService.getLiveSnapshot().then((live) => {
      socket.emit("liveState", live);
    });
    socket.on("disconnect", () => {
      console.log("Socket client disconnected:", socket.id);
    });
  });

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Firebase project: ${firebaseConfig.projectId}`);
    console.log(`CORS origin: ${CLIENT_ORIGIN}`);
  });
}

start();
