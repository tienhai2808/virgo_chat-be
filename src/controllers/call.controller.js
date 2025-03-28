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
      const checkParticipant = call.participants.find((participant) =>
        participant.user.equals(currentUserId)
      );

      if (checkParticipant) {
        return res
          .status(400)
          .json({ message: "Người dùng đang tham gia cuộc gọi" });
      }

      call.participants.push({ user: currentUserId });

      await call.save();
    } else {
      if (call.caller.toString() === currentUserId.toString()) {
        call.status = "missed";
      } else {
        call.participants = call.participants.filter((participant) =>
          participant.user.equals(currentUserId)
        );

        if (call.participants.length === 0) {
          call.status = "ended";
          call.endedAt = new Date();
        }
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
        if (
          status === "connection" &&
          call.caller.equals(currentUserId)
        ) {
          receiverSocketIds.forEach((socketId) => {
            io.to(socketId).emit("callAccepted", {
              signal: req.body.signal,
              peerID: currentUserId.toString(),
            });
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

export const deleteAllCall = async (req, res) => {
  try {
    await Call.deleteMany({});
    res.status(200).json({ message: "Đã xóa tất cả cuộc gọi thành công!" });
  } catch (err) {
    console.log(`Lỗi xóa cuộc gọi: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
