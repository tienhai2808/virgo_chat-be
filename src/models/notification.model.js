import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    isSeen : {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true },
)

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;