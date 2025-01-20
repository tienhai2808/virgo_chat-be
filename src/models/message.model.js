import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, 
    text: {
      type: String,
    },
    file: {
      fileType: {
        type: String,
        enum: ["image", "video", "audio", "other"],
        sparse: true,
      },
      fileName: {
        type: String,
      },
      fileUrl: {
        type: String,
      },
    },
    messageType: {
      type: String,
      enum: ["text", "file"],
      default: "text",
    },
    reactions: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        reactionType: {
          type: String,
          enum: ["like", "love", "laugh", "sad", "angry"],
        },
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "seen"],
      default: "sent",
    },
    readAt: {
      type: Date,
      default: null,
    },
    lifeTime: {
      type: Number,
      sparse: true,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
