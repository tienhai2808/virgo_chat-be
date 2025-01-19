import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    faceId: {
      type: Array,
      unique: true, 
      sparse: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    accountType: {
      type: String,
      enum: ["virgo", "google"],
      default: "virgo",
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
      required: function () {
        return !this.googleId 
      }
    },
    avatar: {
      type: String,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
