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
        return this.accountType === "virgo"; 
      }
    },
    avatar: {
      type: String,
      sparse: true,
    },
    isSuperUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
