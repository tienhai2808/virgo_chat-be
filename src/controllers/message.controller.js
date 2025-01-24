import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";

export const createMessage = async (req, res) => {
  try {
    const { roomId, text, file, messageReplyId, lifeTime } = req.body;
    const senderId = req.user._id;

    if (!text && !file) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
    }

    let fileUrl, fileName, fileType;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(file,{
        resource_type: "auto",
      });
      fileUrl = uploadResponse.secure_url;
      fileType = updateResponse.resource_type;
      fileName = uploadResponse.original_filename;
    }

    const newMessage = new Message({
      room: roomId,
      sender: senderId,
      text,
      file: file ? {
        fileType,
        fileName,
        fileUrl,
      } : undefined,
      messageType: file ? "file" : "text",
      replyTo: messageReplyId,
      lifeTime,
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (err) {
    console.log(`Lỗi gửi tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateMessage = async (req, res) => {
  console.log("hi");
}
