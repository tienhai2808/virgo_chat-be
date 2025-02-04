import Notification from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";
import Room from "../models/room.model.js";
import Relationship from "../models/relationship.model.js";

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

export const createNotification = async (req, res) => {
  const { receiverIds, roomType, roomName } = req.body;
  const sender = req.user;
  
  try {
    if (!receiverIds) {
      return res.status(400).json({ message: "Yêu cầu receiverIds" });
    }

    let content = "";
    if (roomType === "private") {
      content = `${sender.userName} (${sender.fullName}) muốn trò chuyện với bạn`;
    } else {
      content = `${sender.userName} (${sender.fullName}) mời bạn vào nhóm ${
        roomName ? roomName : ""
      }`;
    }

    const newNotification = new Notification({
      sender: sender._id,
      receivers: receiverIds.map((receiverId) => ({
        user: receiverId,
      })),
      content,
      notificationType: roomType,
    })

    if (!newNotification) {
      return res.status(400).json({ message: "Dữ liệu thông báo không hợp lệ" });
    } 

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

    res.status(200).json({ message: "Gửi thông báo thành công" });
  } catch (err) {
    console.log(`Lỗi tạo thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}

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

    const existingNotification = await Notification.findById(notificationId);
    if (!existingNotification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Status không hợp lệ" });
    }

    const updatedNotification = await Notification.findOneAndUpdate(
      { _id: notificationId, "receivers.user": receiverId },
      { $set: { "receivers.$.status": status } },
      { new: true }
    );

    if (status === "accepted" && updatedNotification.notificationType === "private") {
      const existingRelationship = await Relationship.findOne({
        $or: [
          { from: updatedNotification.sender, to: receiverId },
          { from: receiverId, to: updatedNotification.sender },
        ],
        relationshipType: "friend",
      })

      if (!existingRelationship) {
        const newRelationship = new Relationship({
          from: updatedNotification.sender,
          to: receiverId,
          relationshipType: "friend",
        });
  
        await newRelationship.save();
      } 
    }

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
        const roomName = updatedNotification.content.split("mời bạn vào nhóm ")[1];

        const newRoom = new Room({
          notification: notificationId,
          roomName: roomName ? roomName : undefined,
          owner:
            updatedNotification.notificationType === "group"
              ? updatedNotification.sender
              : undefined,
          members: [
            { user: updatedNotification.sender, role: updatedNotification.notificationType === "group" ? "admin" : "member" },
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

    res.status(200).json({ message: "Đã xem các thông báo" });
  } catch (err) {
    console.log(`Lỗi cập nhật thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
