import Room from "../models/room.model.js";
import Message from "../models/message.model.js";

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
      })
    
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
          lastMessage: lastMessage ? {
            text: lastMessage.text,
            messageType: lastMessage.messageType,
            file: lastMessage.file,
            sender: {
              _id: lastMessage.sender._id,
              fullName: lastMessage.sender.fullName,
            },
            createdAt: lastMessage.createdAt,
          } : undefined,
        }
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
  try {
    if (!roomId) {
      return res.status(400).json({ message: "Yêu cầu roomId" });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Phòng không tồn tại" });
    }

    const messages = await Message.find({ room: roomId })
      .populate({
        path: "sender",
        select: "_id fullName avatar",
      })
      .populate({
        path: "reactions.user",
        select: "_id fullName avatar",
      });

    return res.status(200).json({ room, messages });
  } catch (err) {
    console.log(`Lỗi lấy thông tin phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};
