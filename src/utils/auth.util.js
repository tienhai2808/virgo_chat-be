import jwt from "jsonwebtoken";
import User from "../models/user.model.js";


export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

export const convertFullName = async (fullName) => {
  let userName = fullName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  let existingUser = await User.findOne({ userName });
  while (existingUser) {
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    userName = `${userName}${randomNumber}`;
    existingUser = await User.findOne({ userName });
  }

  return userName;
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

