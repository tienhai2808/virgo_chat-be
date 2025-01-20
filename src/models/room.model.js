import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member"],
          default: "member",
        },
        nickName: {
          type: String,
        },
        joinedAt: {
          type: Date,
        },
      },
    ],
    roomType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    settings: {
      allowFileSharing: {
        type: Boolean,
        default: true,
      },
      adminOnlyMessages: {
        type: Boolean,
        default: false,
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;