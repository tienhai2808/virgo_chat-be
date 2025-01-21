import mongoose from "mongoose";

const relationshipSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    relationshipType: {
      type: String,
      enum: ["friend", "block"],
      default: "friend",
      required: true,
    }
  },
  { timestamps: true }
);

const Relationship = mongoose.model("Relationship ", relationshipSchema);

export default Relationship;
