import cloudinary from "../config/cloudinary.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";

export const createMessage = async (req, res) => {
  const { roomId, text, image, messageReplyId, lifeTime } = req.body;

  try {
    const senderId = req.user._id;

    if (!text && !image) {
      return res
        .status(400)
        .json({ message: "Nội dung tin nhắn không được để trống" });
    }

    let imageUrl = undefined;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "virgo_chat/messages",
        resource_type: "image",
      });

      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = new Message({
      room: roomId,
      sender: senderId,
      text,
      image: imageUrl,
      replyTo: messageReplyId,
      lifeTime,
    });

    await newMessage.save();

    const newMessageSerializer = await Message.findById(
      newMessage._id
    ).populate([
      {
        path: "sender",
        select: "_id fullName avatar",
      },
      {
        path: "room",
        select: "members",
        populate: {
          path: "members.user",
          select: "_id fullName avatar",
        },
      },
    ]);

    await Promise.all(
      newMessageSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
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
  const { messageId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    if (!message.sender.equals(userId)) {
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật tin nhắn" });
    }

    const updatedMessageSerializer = await Message.findByIdAndUpdate(
      messageId,
      { text },
      { new: true }
    ).populate([
      {
        path: "sender",
        select: "_id fullName avatar",
      },
      {
        path: "room",
        select: "members",
        populate: {
          path: "members.user",
          select: "_id fullName avatar",
        },
      },
    ]);

    await Promise.all(
      updatedMessageSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedMessage", updatedMessageSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Cập nhật tin nhắn thành công" });
  } catch (err) {
    console.log(`Lỗi cập nhật tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const reactionMessage = async (req, res) => {
  const { messageId } = req.params;
  const { reactionType } = req.body;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    const existingReaction = message.reactions.find((reaction) =>
      reaction.user.equals(userId)
    );

    if (existingReaction) {
      if (existingReaction.reactionType === reactionType) {
        message.reactions = message.reactions.filter(
          (reaction) => !reaction.user.equals(userId)
        );
      } else {
        existingReaction.reactionType = reactionType;
      }
    } else {
      message.reactions.push({ user: userId, reactionType });
    }

    const updatedMessageSerializer = await Message.findByIdAndUpdate(
      messageId,
      { reactions: message.reactions },
      { new: true }
    ).populate([
      { path: "sender", select: "_id fullName avatar" },
      {
        path: "room",
        select: "members",
        populate: { path: "members.user", select: "_id fullName avatar" },
      },
      { path: "reactions.user", select: "_id fullName avatar" },
    ]);

    await Promise.all(
      updatedMessageSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("reactionMessage", updatedMessageSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Reaction tin nhắn thành công" });
  } catch (err) {
    console.log(`Lỗi reaction tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  try {
    const message = await Message.findById(messageId).populate({
      path: "room",
      select: "members",
      populate: { path: "members.user", select: "_id" },
    });

    if (!message) {
      return res.status(404).json({ message: "Không tìm thấy tin nhắn" });
    }

    if (!message.sender.equals(userId)) {
      return res.status(403).json({ message: "Không có quyền xóa tin nhắn" });
    }

    await Message.findByIdAndDelete(messageId);

    await Promise.all(
      message.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("deletedMessage", { messageId });
          });
        }
      })
    );

    res.status(200).json({ message: "Xóa tin nhắn thành công" });
  } catch (err) {
    console.log(`Lỗi xóa tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const deleteAllMessage = async (req, res) => {
  try {
    await Message.deleteMany({});
    res.status(200).json({ message: "Đã xóa tất cả tin nhắn thành công!" });
  } catch (err) {
    console.log(`Lỗi xóa tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
