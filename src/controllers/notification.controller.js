import Notification from "../models/notification.model.js";
import { getReceiverSocketId } from "../services/socket.service.js";

export const getNotifications = async (req, res) => {
  const receiverId = req.user._id;
  try {
    const notifications = await Notification.find({ receiver: receiverId });

    res.status(200).json({ notifications });
  } catch (err) {
    console.log(`Lỗi lấy thông tin thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const createNotification = async (req, res) => {
  const { roomType, receiverId, roomName } = req.body;
  const sender = req.user;
  try {
    if (!roomType || !receiverId) {
      return res
        .status(400)
        .json({ message: "Yêu cầu roomType và receiverId" });
    }
    const content = `${sender.fullName} ${
      roomType === "private"
        ? "muốn trò chuyện với bạn"
        : `muốn mời bạn tham gia ${roomName}`
    }`;
    const newNotification = new Notification({
      sender: sender._id,
      receiver: receiverId,
      content,
    });
    if (newNotification) {
      await newNotification.save();

      const receiverSocketId = getReceiverSocketId(receiverId);

      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("newNotification", newNotification);
      }

      return res.status(200).json({ message: "Gửi thông báo thành công" });
    } else {
      return res
        .status(400)
        .json({ message: "Dữ liệu thông báo không hợp lệ" });
    }
  } catch (err) {
    console.log(`Lỗi tạo thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
