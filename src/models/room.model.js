import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    members: [
      {
        userId: {
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
          default: Date.now,
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
      messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Message",
      },
      sentAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);

export default Room;