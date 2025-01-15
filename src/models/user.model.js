import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      default: "",
    },
    googleId: {
      type: String,
      unique: true,
      default: "",
    },
    faceId: {
      type: String, 
      unique: true,
      default: "",
    },
    phoneNumber: {
      type: String,
      unique: true, 
      default: "",
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
