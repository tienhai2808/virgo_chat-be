import jwt from "jsonwebtoken";
import { google } from "googleapis"
import User from "../models/user.model.js";
import faceapi from "face-api.js"

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

export const oauth2client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage'
)

export const extractFaceEmbeddings = async (imageUrl) => {
  const img = await faceapi.fetchImage(imageUrl);
  const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptors();
  if (!detections) {
    throw new Error("Không thể phát hiện khuôn mặt trong ảnh.");
  }

  return detections.descriptor;
}

export const compareEmbeddings = (embedding1, embedding2) => {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Hai embeddings phải có cùng chiều dài.");
  }

  const dotProduct = embedding1.reduce((acc, val, idx) => acc + val * embedding2[idx], 0);
  const norm1 = Math.sqrt(embedding1.reduce((acc, val) => acc + val * val, 0));
  const norm2 = Math.sqrt(embedding2.reduce((acc, val) => acc + val * val, 0));

  const cosineSimilarity = dotProduct / (norm1 * norm2);
  return cosineSimilarity;
};
