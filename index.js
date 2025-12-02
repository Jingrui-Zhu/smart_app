import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./src/routes/authRoutes.js";
import translationRouter from "./src/routes/translationRoutes.js";
import imageRouter from "./src/routes/imageRoutes.js";
//import flashcardRouter from "./src/routes/flashcardRoutes.js";
import listRouter from "./src/routes/listRoutes.js";
import { getSharedListPublicHandler } from "./src/controllers/listController.js";
dotenv.config();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" })); // tune for your payloads
app.use(express.urlencoded({ extended: true }));

// healthcheck
app.get("/_healthz", (req, res) => res.sendStatus(200));
app.get("/", (req, res) => res.json({ message: "Visual Dictionary backend running" }));

app.use("/auth", authRouter);
app.use("/translate", translationRouter);
app.use("/images", imageRouter);
//app.use("/flashcards", flashcardRouter);
app.use("/lists", listRouter);

// Public endpoint to retrieve a shared list by token (no auth required)
app.get("/share/list/:sharedCode", getSharedListPublicHandler);

app.use((err, req, res, next) => {
  res.status(400).json({
    status: "bad request",
    message: err.message,
  });
});

app.use((err, req, res, next) => {
    res.status(404).json({
      status: "route not found",
      message: err.message,
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
