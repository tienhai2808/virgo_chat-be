import mongoose from "mongoose";

const callSchema = new mongoose.Schema({
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  participants: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      _id: false,
    },
  ],
  viewers: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      seenAt: {
        type: Date,
      },
      _id: false,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["calling", "ended", "missed"],
    default: "calling",
  },
  endedAt: {
    type: Date,
  },
  timeCall: {
    type: Number,
  },
});

callSchema.pre("save", function (next) {
  if (this.endedAt) {
    this.timeCall = Math.floor((this.endedAt - this.createdAt) / 1000);
  } else {
    this.timeCall = undefined;
  }

  next();
});

const Call = mongoose.model("Call", callSchema);

export default Call;
