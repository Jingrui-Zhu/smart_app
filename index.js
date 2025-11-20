import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./src/routes/authRoutes.js";
import translationRouter from "./src/routes/translationRoutes.js";
import captureRouter from "./src/routes/captureRoutes.js";
import flashcardRouter from "./src/routes/flashcardRoutes.js";
import listRouter from "./src/routes/listRoutes.js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.json({ message: "Visual Dictionary backend running" }));

app.use("/auth", authRouter);
app.use("/translate", translationRouter);
app.use("/capture", captureRouter);
app.use("/flashcards", flashcardRouter);
app.use("/lists", listRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
