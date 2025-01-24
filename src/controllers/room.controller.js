import Room from "../models/room.model.js";

export const getRooms = async (req, res) => {
  const userId = req.user._id;
  try {
    const rooms = await Room.find({
      "members.user": userId,
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

export const getRoom = async (req, res) => {
  const { roomId } = req.params;
  try {
    if (!roomId) {
      return res.status(400).json({ message: "Yêu cầu roomId" });
    }

  } catch (err) {
    console.log(`Lỗi lấy thông tin phòng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}