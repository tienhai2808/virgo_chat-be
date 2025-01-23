import Notification from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";
import Room from "../models/room.model.js";

export const getNotifications = async (req, res) => {
  const receiverId = req.user._id;
  try {
    const notifications = await Notification.find({
      "receivers.user": receiverId,
    })
      .populate({
        path: "receivers.user",
        select: "_id fullName userName avatar createdAt",
      })
      .populate({
        path: "sender",
        select: "_id fullName userName avatar createdAt",
      });

    res.status(200).json({ notifications });
  } catch (err) {
    console.log(`Lỗi lấy thông tin thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const createPrivateNotification = async (req, res) => {
  const { receiverId } = req.body;
  const sender = req.user;
  try {
    if (!receiverId) {
      return res.status(400).json({ message: "Yêu cầu receiverId" });
    }

    const existingNotification = await Notification.findOne({
      sender: sender._id,
      "receivers.user": receiverId,
      notificationType: "private",
    });
    
    const content = `${sender.userName} (${sender.fullName}) muốn trò chuyện với bạn`;
    const newNotification = new Notification({
      sender: sender._id,
      receivers: [
        {
          user: receiverId,
        },
      ],
      content,
    });
    if (newNotification) {
      await newNotification.save();

      const newNotificationSerializer = await newNotification.populate({
        path: "sender",
        select: "_id fullName userName avatar createdAt",
      });

      const receiverSocketIds = getReceiverSocketId(receiverId);

      if (receiverSocketIds && receiverSocketIds.length > 0) {
        receiverSocketIds.forEach((socketId) => {
          io.to(socketId).emit("newNotification", newNotificationSerializer);
        });
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

export const createGroupNotification = async (req, res) => {
  const { receiverIds, roomName } = req.body;
  const sender = req.user;
  try {
    if (!receiverIds) {
      return res.status(400).json({ message: "Yêu cầu receiverIds" });
    }
    const content = `${sender.userName} (${sender.fullName}) mời bạn vào nhóm ${
      roomName ? roomName : ""
    }`;
    const newNotification = new Notification({
      sender: sender._id,
      receivers: receiverIds.map((receiverId) => ({
        user: receiverId,
      })),
      content,
      notificationType: "group",
    });
    if (newNotification) {
      await newNotification.save();

      const newNotificationSerializer = await newNotification.populate({
        path: "sender",
        select: "_id fullName userName avatar createdAt",
      });

      await Promise.all(
        receiverIds.map(async (receiverId) => {
          const receiverSocketIds = getReceiverSocketId(receiverId);
          if (receiverSocketIds && receiverSocketIds.length > 0) {
            receiverSocketIds.forEach((socketId) => {
              io.to(socketId).emit(
                "newNotification",
                newNotificationSerializer
              );
            });
          }
        })
      );

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

export const updateStatusNotification = async (req, res) => {
  const { status } = req.body;
  const { notificationId } = req.params;
  const receiverId = req.user._id;
  try {
    if (!notificationId || !status) {
      return res
        .status(400)
        .json({ message: "Yêu cầu ID và trạng thái cần xét cho thông báo" });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status không hợp lệ" });
    }

    const updatedNotification = await Notification.findOneAndUpdate(
      { _id: notificationId, "receivers.user": receiverId },
      { $set: { "receivers.$.status": status } },
      { new: true }
    );

    const existingRoom = await Room.findOne({ notification: notificationId });

    if (existingRoom) {
      if (status === "accepted") {
        await Room.updateOne(
          { notification: notificationId },
          { $push: { members: { user: receiverId } } }
        );
      }
    } else {
      if (status === "accepted") {
        const newRoom = new Room({
          notification: notificationId,
          owner:
            updatedNotification.notificationType === "group"
              ? receiverId
              : undefined,
          members: [
            { user: updatedNotification.sender, role: "admin" },
            { user: receiverId },
          ],
          roomType: updatedNotification.notificationType,
        });
        await newRoom.save();
      }
    }

    res
      .status(200)
      .json({ message: "Cập nhật trạng thái thông báo thành công" });
  } catch (err) {
    console.log(`Lỗi cập nhật thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateSeenNotification = async (req, res) => {
  const { notificationIds } = req.body;
  const receiverId = req.user._id;
  try {
    if (!notificationIds) {
      return res.status(400).json({ message: "Yêu cầu notificationIds" });
    }

    await Notification.updateMany(
      { _id: { $in: notificationIds }, "receivers.user": receiverId },
      { $set: { "receivers.$.isSeen": true } }
    );

    return res.status(200).json({ message: "Đã xem các thông báo" });
  } catch (err) {
    console.log(`Lỗi cập nhật thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
