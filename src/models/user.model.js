import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      sparse: true,
      unique: true,
      required: function () {
        return !this.facebookId
      }
    },
    face: {
      faceUrl: {
        type: String,
        unique: true,
        sparse: true,
      },
      faceEmbeddings: {
        type: [Number],
        unique: true,
        sparse: true,
        required: function () {
          return this.faceId.faceIdUrl
        }
      }
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    accountType: {
      type: String,
      enum: ["virgo", "google", "facebook"],
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
        return !this.googleId && !this.facebookId
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
