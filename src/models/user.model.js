import { parse } from "dotenv";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      default: null,
      sparse: true,
    },
    faceId: {
      type: String, 
      default: null,
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
      default: null,
      sparse: true,
      minlength: 6,
    },
    avatar: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
