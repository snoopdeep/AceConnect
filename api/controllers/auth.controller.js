import User from "../models/user.model.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../util/error.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS, // Your Gmail password or App Password
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for Signup Verification",
    text: `Your OTP is: ${otp}`,
  };

  await transporter.sendMail(mailOptions);
};

function checkPassword(str) {
  var re = /^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  return re.test(str);
}

export const signup = async (req, res, next) => {
  console.log("Hello from signup controller ", " Request body:", req.body);
  const { name, email, password } = req.body;
  if (
    !name ||
    !email ||
    !password ||
    name.trim() === "" ||
    email.trim() === "" ||
    password.trim() === ""
  ) {
    return next(errorHandler(400, "All fields are required"));
  }

  // Password validation
  if (!checkPassword(password)) {
    return next(
      errorHandler(
        400,
        "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one digit, and one special character."
      )
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(errorHandler(400, "User with this email already exists"));
  }

  const hashedPassword = bcryptjs.hashSync(password, 10);
  const otp = generateOTP();
  try {
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 10 * 60 * 1000, // OTP valid for 10 minutes
    });
    console.log("New User successfully created in database!");
    await sendOTPEmail(email, otp);
    // Do not send the OTP back to the client for security reasons
    return res.status(201).json({
      message: "User created successfully. OTP sent to email.",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (err) {
    console.log(err.message);
    next(err);
  }
};

export const signin = async (req, res, next) => {
  console.log("Hello from signin controller ", " Request body:", req.body);
  try {
    const { email, password } = req.body;
    if (!email || !password || email === "" || password === "") {
      return next(errorHandler(400, "All fields are required"));
    }

    const validUser = await User.findOne({ email });
    // console.log(validUser);
    if (!validUser) {
      return next(errorHandler(400, "User not found"));
    }
    const validPassword = bcryptjs.compareSync(password, validUser.password);
    // console.log(validPassword);
    if (!validPassword) {
      return next(errorHandler(400, "Invalid password"));
    }
    // user is validate
    validUser.password = undefined;
    const token = jwt.sign(
      { id: validUser._id, isAdmin: validUser.isAdmin },
      process.env.JWT_SECRET,
      {
        expiresIn: 1000 * 60 * 5,
      }
    );
    res
      .status(200)
      .cookie("access_token", token, { httpOnly: true })
      .json(validUser);
  } catch (err) {
    console.log("Error:", err.message);
    return next(err);
  }
};

export const google = async (req, res, next) => {
  console.log("Hello from google controller ", " Request body:", req.body);
  const { email, name, googlePhotoURL } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign(
        { id: user._id, isAdmin: user.isAdmin },
        process.env.JWT_SECRET,
        {
          expiresIn: "1h",
        }
      );
      user.password = undefined;
      res
        .status(200)
        .cookie("access_token", token, { httpOnly: true })
        .json(user);
    } else {
      const generatePassword = Math.random().toString(36).slice(-8);
      const hashedPassword = bcryptjs.hashSync(generatePassword, 10);
      const newUser = await User.create({
        name:
          name.toLowerCase().split(" ").join("") +
          Math.random().toString(9).slice(-5),
        email,
        password: hashedPassword,
        profilePicture: googlePhotoURL,
      });
      await newUser.save();
      console.log("New User successfully created in database!");
      const token = jwt.sign(
        { id: newUser._id, isAdmin: newUser.isAdmin },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      newUser.password = undefined;
      res
        .status(200)
        .cookie("access_token", token, { httpOnly: true })
        .json(newUser);
    }
  } catch (err) {
    next(err);
  }
};
