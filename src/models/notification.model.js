import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receivers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        isSeen: {
          type: Boolean,
          default: false,
        },
        _id: false,
      },
    ],
    content: {
      type: String,
      required: true,
    },
    notificationType: {
      type: String,
      enum: ["private", "group"],
      default: "private",
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
