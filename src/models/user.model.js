import { parse } from "dotenv";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
    },
    googleId: {
      type: String,
      default: null,
      unique: true, 
      sparse: true,
    },
    faceId: {
      type: String, 
      default: null,
      unique: true,
      sparse: true,
    },
    phoneNumber: {
      type: String, 
      default: null,
      unique: true,
      sparse: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
