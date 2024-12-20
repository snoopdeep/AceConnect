import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import postRouter from "./routes/post.route.js";
import commentRouter from "./routes/comment.route.js";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import xss from "xss-clean";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";

const app = express();
// to allow json data to the backend
app.use(express.json());
// cookie parser middleware which will parse the cookies from the request
app.use(cookieParser());

// Set security HTTP headers
app.use(helmet());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss()); -> this is not letting rendering the correct html format

// // import cors for cross origin resource sharing
import cors from "cors";
// Enable CORS for all routes
// app.use(cors());
app.use(
  cors({
    origin: "http://localhost:5173", // Adjust according to your front-end URL
    credentials: true, // This allows cookies to be sent with the requests
  })
);

// console.log("MONGO_URL:", process.env.MONGO_URL);
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB!!");
  })
  .catch((err) => {
    console.log("Error:", err.message);
  });

app.listen(3000, () => {
  console.log("Server is running on port 3000!!");
});

// create a route
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/post", postRouter);
app.use("/api/comment", commentRouter);

// global error handler middleware

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});
