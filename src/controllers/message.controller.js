import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";

export const getRoomForSideBar = async (req, res) => {
  try {
    const userId = req.user._id;
    const rooms = await Room.find({
      "member.user": userId,
    })
      .select("name _id roomType lastMessage members")
      .populate({
        path: "lastMessage",
        select: "sender messageType text file createdAt",
        populate: {
          path: "sender",
          select: "fullName",
        },
      });

    res.status(200).json({ rooms });
  } catch (err) {
    console.log(`Lỗi lấy thông tin người dùng cho SideBar: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const createRoom = async (req, res) => {
  const { userId } = req.body
};

export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id;

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    });

    res.status(200).json(messages);
  } catch (err) {
    console.log(`Lỗi lấy tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id;

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    res.status(201).json(newMessage);
  } catch (err) {
    console.log(`Lỗi gửi tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
