import Room from "../models/room.model.js";
import Call from "../models/call.model.js";
import { getReceiverSocketId, io } from "../services/socket.service.js";

export const createCall = async (req, res) => {
  const { roomId } = req.body;

  try {
    if (!roomId) {
      return res.status(400).json({ message: "Yêu cầu roomId" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy cuộc trò chuyện" });
    }

    const existingCall = await Call.findOne({
      room: roomId,
      status: "calling",
    });

    if (existingCall) {
      return res.status(400).json({ message: "Cuộc gọi đang diễn ra" });
    }

    const newCall = new Call({
      room: roomId,
      caller: req.user._id,
      participants: [{ user: req.user._id }],
    });

    await newCall.save();

    const newCallSerializer = await Call.findById(newCall._id).populate([
      {
        path: "caller",
        select: "_id fullName avatar",
      },
      {
        path: "participants.user",
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
      newCallSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("newCall", newCallSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Tạo cuộc gọi thành công" });
  } catch (err) {
    console.log(`Lỗi tạo cuộc gọi: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateParticipantCall = async (req, res) => {
  const { callId } = req.params;
  const { status } = req.body;
  const currentUserId = req.user._id;

  try {
    const call = await Call.findById(callId);

    if (!call) {
      return res.status(404).json({ message: "Không tìm thấy cuộc gọi" });
    }

    if (status === "connection") {
      const checkParticipant = call.participants.find(
        (participant) =>
          participant.user.toString() === currentUserId.toString()
      );

      if (checkParticipant) {
        return res
          .status(400)
          .json({ message: "Người dùng đang tham gia cuộc gọi" });
      }

      call.participants.push({ user: currentUserId });

      await call.save();
    } else {
      const checkParticipant = call.participants.find(
        (participant) =>
          participant.user.toString() === currentUserId.toString()
      );

      if (!checkParticipant) {
        return res
          .status(400)
          .json({ message: "Người dùng không tham gia cuộc gọi" });
      }

      call.participants = call.participants.filter(
        (participant) =>
          participant.user.toString() !== currentUserId.toString()
      );

      if (call.participants.length === 0) {
        call.status = "ended";
        call.endedAt = new Date();
      }

      await call.save();
    }

    const updatedCallSerializer = await Call.findById(callId).populate([
      {
        path: "caller",
        select: "_id fullName avatar",
      },
      {
        path: "participants.user",
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
      updatedCallSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedCall", updatedCallSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Cập nhật cuộc gọi thành công" });
  } catch (err) {
    console.log(`Lỗi cập nhật cuộc gọi: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const updateStatusCall = async (req, res) => {
  const { callId } = req.params;
  try {
    const call = await Call.findById(callId);

    if (!call) {
      return res.status(404).json({ message: "Không tìm thấy cuộc gọi" });
    }

    if (call.participants.length > 0) {
      return res.status(400).json({ message: "Cuộc gọi đang diễn ra" });
    }

    if (call.status === "ended") {
      return res.status(400).json({ message: "Cuộc gọi đã kết thúc" });
    };

    call.status = "missed";

    await call.save();

    const updatedCallSerializer = await Call.findById(callId).populate([
      {
        path: "caller",
        select: "_id fullName avatar",
      },
      {
        path: "participants.user",
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
      updatedCallSerializer.room.members.map(async (member) => {
        const receiverSocketIds = getReceiverSocketId(
          member.user._id.toString()
        );
        if (receiverSocketIds && receiverSocketIds.length > 0) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("updatedCall", updatedCallSerializer);
          });
        }
      })
    );

    res.status(200).json({ message: "Cập nhật trạng thái cuộc gọi thành công" });
  } catch (err) {
    console.log(`Lỗi cập nhật trạng thái cuộc gọi: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
