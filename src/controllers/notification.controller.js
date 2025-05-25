import Notification from "../models/notification.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";
import Room from "../models/room.model.js";
import Relationship from "../models/relationship.model.js";

export const getNotifications = async (req, res) => {
  const receiverId = req.user._id;
  try {
    const notifications = await Notification.find({
      "receivers.user": receiverId,
    }).populate([
      {
        path: "receivers.user",
        select: "_id fullName userName avatar createdAt",
      },
      {
        path: "sender",
        select: "_id fullName userName avatar createdAt",
      },
    ]);

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

    const existingNotifications = await Notification.find({
      sender: sender._id,
      "receivers.user": { $all: receiverIds },
      notificationType: roomType,
      receivers: { $size: receiverIds.length },
    });
    if (existingNotifications.length > 0) {
      const notificationsWithPending = existingNotifications.filter(
        (notification) =>
          notification.receivers.every(
            (receiver) => receiver.status === "pending"
          )
      );

      if (notificationsWithPending.length > 0) {
        return res.status(400).json({
          message: "Bạn đã gửi lời mời này trước đó",
        });
      }
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
    });

    if (!newNotification) {
      return res
        .status(400)
        .json({ message: "Dữ liệu thông báo không hợp lệ" });
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
            io.to(socketId).emit("newNotification", newNotificationSerializer);
          });
        }
      })
    );

    res.status(200).json(newNotificationSerializer);
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

    let existingRoom = await Room.findOne({ notification: notificationId });

    if (existingRoom) {
      if (status === "accepted") {
        await Room.updateOne(
          { notification: notificationId },
          { $push: { members: { user: receiverId } } }
        );
      }
    } else {
      if (status === "accepted") {
        const roomName =
          updatedNotification.content.split("mời bạn vào nhóm ")[1];

        const newRoom = new Room({
          notification: notificationId,
          roomName: roomName ? roomName : undefined,
          owner:
            updatedNotification.notificationType === "group"
              ? updatedNotification.sender
              : undefined,
          members: [
            {
              user: updatedNotification.sender,
              role:
                updatedNotification.notificationType === "group"
                  ? "admin"
                  : "member",
            },
            { user: receiverId },
          ],
          roomType: updatedNotification.notificationType,
        });

        await newRoom.save();
        existingRoom = newRoom;
      }
    }

    if (
      status === "accepted" &&
      updatedNotification.notificationType === "private"
    ) {
      const newRelationship = new Relationship({
        from: updatedNotification.sender,
        to: receiverId,
        relationshipType: "friend",
        room: existingRoom ? existingRoom._id : undefined,
      });

      await newRelationship.save();
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

export const deleteNotification = async (req, res) => {
  const { notificationId } = req.params;
  const senderId = req.user._id;

  try {
    if (!notificationId) {
      return res.status(400).json({ message: "Yêu cầu notificationId" });
    }

    const existingNotification = await Notification.findOne({
      _id: notificationId,
      sender: senderId,
    });
    if (!existingNotification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    const acceptedReceiver = existingNotification.receivers.find(
      (receiver) => receiver.status === "accepted"
    );

    if (acceptedReceiver) {
      return res.status(403).json({
        message: "Không thể xóa thông báo vì đã có người nhận chấp nhận",
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    await Promise.all(
      existingNotification.receivers.map(async (receiver) => {
        const receiverSocketIds = getReceiverSocketId(receiver.user.toString());
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("deletedNotification", notificationId);
          });
        }
      })
    );

    res.status(200).json({ message: "Xóa thông báo thành công" });
  } catch (err) {
    console.log(`Lỗi xóa thông báo: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
