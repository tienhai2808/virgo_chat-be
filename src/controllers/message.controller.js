import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";

export const createMessage = async (req, res) => {
  try {
    const { roomId, text, file, messageReplyId, lifeTime } = req.body;
    const senderId = req.user._id;

    if (!text && !file) {
      return res
        .status(400)
        .json({ message: "Nội dung tin nhắn không được để trống" });
    }

    let fileUrl, fileName, fileType;
    if (file) {
      const uploadResponse = await cloudinary.uploader.upload(file, {
        resource_type: "auto",
        folder: "messages"
      });
      fileUrl = uploadResponse.secure_url;
      fileType = uploadResponse.resource_type;
      fileName = uploadResponse.original_filename;
    }

    const newMessage = new Message({
      room: roomId,
      sender: senderId,
      text,
      file: file
        ? {
            fileType,
            fileName,
            fileUrl,
          }
        : undefined,
      messageType: file ? "file" : "text",
      replyTo: messageReplyId,
      lifeTime,
    });

    await newMessage.save();

    const newMessageSerializer = await Message.findById(newMessage._id)
    .populate({
      path: "sender",
      select: "_id fullName avatar",
    })
    .populate({
      path: "room",
      select: "members", 
      populate: {
        path: "members.user", 
        select: "_id fullName avatar", 
      },
    });

    await Promise.all(
      newMessageSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(member.user._id);
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("newMessage", newMessageSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Gửi tin nhắn thành công" });
  } catch (err) {
    console.log(`Lỗi gửi tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateMessage = async (req, res) => {
  console.log("hi");
};
