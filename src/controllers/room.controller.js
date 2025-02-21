import Room from "../models/room.model.js";
import Message from "../models/message.model.js";
import Relationship from "../models/relationship.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";
import Call from "../models/call.model.js";

export const getRooms = async (req, res) => {
  const userId = req.user._id;
  try {
    const rooms = await Room.find({
      "members.user": userId,
    })
      .select("name _id roomType members")
      .populate({
        path: "members.user",
        select: "_id fullName avatar",
      });

    const roomWithLastMessages = await Promise.all(
      rooms.map(async (room) => {
        const lastMessage = await Message.findOne({ room: room._id })
          .populate({
            path: "sender",
            select: "_id fullName",
          })
          .sort({ createdAt: -1 })
          .lean();
        return {
          ...room.toObject(),
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                messageType: lastMessage.messageType,
                file: lastMessage.file,
                sender: {
                  _id: lastMessage.sender._id,
                  fullName: lastMessage.sender.fullName,
                },
                createdAt: lastMessage.createdAt,
              }
            : undefined,
        };
      })
    );

    res.status(200).json({ rooms: roomWithLastMessages });
  } catch (err) {
    console.log(`Lỗi lấy thông tin người dùng cho SideBar: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const getRoom = async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  try {
    if (!roomId) {
      return res.status(400).json({ message: "Yêu cầu roomId" });
    }

    const room = await Room.findById(roomId).populate({
      path: "members.user",
      select: "_id fullName avatar",
    });

    if (!room) {
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    const memberIds = room.members.map((member) => member.user._id);

    const [blockedRelationships, blockedByRelationships] = await Promise.all([
      Relationship.find({
        from: currentUserId,
        to: { $in: memberIds },
        relationshipType: "block",
      }).populate({ path: "to", select: "_id fullName userName avatar" }),
      Relationship.find({
        from: { $in: memberIds },
        to: currentUserId,
        relationshipType: "block",
      }).populate({ path: "from", select: "_id fullName userName avatar" }),
    ]);

    const blockedMembers = blockedRelationships.map((rel) => rel.to);
    const blockedByMembers = blockedByRelationships.map((rel) => rel.from);

    const latestDeletedAt =
      room.members.find((member) => member.user._id.equals(currentUserId))
        ?.latestDeletedAt || new Date(0);

    const messages = await Message.find({
      room: roomId,
      createdAt: { $gt: latestDeletedAt },
    }).populate([
      {
        path: "sender",
        select: "_id fullName avatar",
      },
      {
        path: "reactions.user",
        select: "_id fullName avatar",
      },
    ]);

    const calls = await Call.find({
      room: roomId,
      createdAt: { $gt: latestDeletedAt },
    }).populate({
      path: "caller",
      select: "_id fullName avatar",
    });

    res.status(200).json({
      room: { ...room.toObject(), blockedMembers, blockedByMembers },
      messages, calls,
    });
  } catch (err) {
    console.log(`Lỗi lấy thông tin phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateNickName = async (req, res) => {
  const { roomId } = req.params;
  const { nickName, userId } = req.body;
  const currentUserId = req.user._id;

  try {
    const room = await Room.findById(roomId).populate({
      path: "members.user",
      select: "_id",
    });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const memberChangeNickName = room.members.find(
      (member) => member.user.toString() === userId
    );

    const checkPermission = room.members.find(
      (member) => member.user.toString() === currentUserId
    );

    if (!checkPermission || !memberChangeNickName) {
      return res
        .status(403)
        .json({ message: "Không có quyền cập nhật nickname" });
    }

    memberChangeNickName.nickName = nickName ? nickName : undefined;

    await room.save();

    await Promise.all(
      room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedNickName", room);
          });
        }
      })
    );

    res.status(200).json({ message: "Cập nhật nickname thành công" });
  } catch (err) {
    console.log(`Lỗi cập nhật nickname: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const deleteRoom = async (req, res) => {
  const { roomId } = req.params;

  try {
    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    await Message.deleteMany({ room: roomId });

    await Relationship.deleteOne({ room: roomId });

    await room.deleteOne();

    res.status(200).json({ message: "Xóa phòng thành công" });
  } catch (err) {
    console.log(`Lỗi xóa phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateRoomName = async (req, res) => {
  const { roomId } = req.params;
  const { roomName } = req.body;

  try {
    const room = Room.findById(roomId).populate({
      path: "members.user",
      select: "_id",
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    if (room.roomType === "private") {
      return res
        .status(400)
        .json({ message: "Không thể đổi tên cuộc trò chuyện" });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền sửa tên cuộc trò chuyện" });
    }

    room.roomName = roomName ? roomName : undefined;

    await room.save();

    await Promise.all(
      room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedRoomName", room);
          });
        }
      })
    );

    res
      .status(200)
      .json({ message: "Cập nhật tên cuộc trò chuyện thành công" });
  } catch (err) {
    console.log(`Lỗi xóa phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateRoomImage = async (req, res) => {
  const { roomId } = req.params;
  const { image } = req.body;

  try {
    const room = Room.findById(roomId).populate({
      path: "members.user",
      select: "_id",
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    if (room.roomType === "private") {
      return res
        .status(400)
        .json({ message: "Không thể thay đổi ảnh của cuộc trò chuyện" });
    }

    if (room.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền thay đổi ảnh của cuộc trò chuyện" });
    }

    let imageUrl = undefined;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "rooms",
        resource_type: "image",
      });

      imageUrl = uploadResponse.secure_url;
    }

    room.roomImage = imageUrl;

    await room.save();

    await Promise.all(
      room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedRoomImage", room);
          });
        }
      })
    );

    res
      .status(200)
      .json({ message: "Cập nhật ảnh cuộc trò chuyện thành công" });
  } catch (err) {
    console.log(`Lỗi xóa phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateRemoveChat = async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user._id;

  try {
    const room = Room.findById(roomId).populate({
      path: "members.user",
      select: "_id",
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const memberRemoveChat = room.members.find(
      (member) => member.user.toString() === userId
    );

    const checkPermission = room.members.find(
      (member) => member.user.toString() === currentUserId
    );

    if (!memberRemoveChat || !checkPermission) {
      return res
        .status(403)
        .json({ message: "Không có quyền xóa nội dung cuộc trò chuyện" });
    }

    memberRemoveChat.latestDeletedAt = new Date();

    await room.save();

    res.status(200).json({ message: "Đã xóa nội dung cuộc trò chuyện" });
  } catch (err) {
    console.log(`Lỗi xóa phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateSeenChat = async (req, res) => {
  const currentUserId = req.user._id;
  const { roomId } = req.params;

  try {
    const room = Room.findById(roomId).populate({
      path: "members.user",
      select: "_id fullName avatar",
    });

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const checkMember = room.members.find(
      (member) => member.user.toString() === currentUserId
    );

    if (!checkMember) {
      return res.status(403).json({ message: "Không có quyền xem tin nhắn" });
    }

    await Message.updateMany(
      {
        room: roomId,
        "viewers.user": { $ne: currentUserId },
      },
      {
        $push: { viewers: { user: currentUserId, seenAt: new Date() } },
      }
    );

    await Call.updateMany(
      {
        room: roomId,
        "viewers.user": { $ne: currentUserId },
      },
      {
        $push: { viewers: { user: currentUserId, seenAt: new Date() } },
      }
    );

    Promise.all(
      room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedSeenMessage", "seenAllMessage");
          });
        }
      })
    );

    res.status(200).json({ message: "Đã seen hết tin nhắn" });
  } catch (err) {
    console.log(`Lỗi cập nhật tin nhắn: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}

export const updateKickMember = async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  const currentUserId = req.user._id;

  try {
    const room = await Room.findById(roomId).populate({
      path: "members.user",
      select: "_id",
    })

    if (!room) {
      return res.status(404).json({ message: "Không tìm thấy phòng" });
    }

    const memberKick = room.members.find(
      (member) => member.user.toString() === userId
    );

    const checkPermission = room.members.filter(
      (member) => member.role === "admin"
    );

    if (!memberKick || memberKick.user.toString() === room.owner.toString()) {
      return res
        .status(403)
        .json({ message: "Không có quyền kick thành viên khỏi phòng" });
    }
  } catch (err) {
    console.log(`Lỗi kick thành viên khỏi phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

