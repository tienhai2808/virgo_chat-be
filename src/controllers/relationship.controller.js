import Relationship from "../models/relationship.model.js";

export const blockUser = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Yêu cầu userId" });
    }

    const from = req.user._id;
    const to = userId;

    const relationship = await Relationship.findOne({
      $or: [
        { from, to },
        { from: to, to: from },
      ],
    });

    if (relationship) {
      if (relationship.relationshipType === "block") {
        return res.status(400).json({ message: "Đã chặn người dùng này" });
      }

      await Relationship.updateOne(
        { _id: relationship._id },
        { relationshipType: "block" },
        { new: true }
      );
    } else {
      const newRelationship = new Relationship({
        from,
        to,
        relationshipType: "block",
      });

      await newRelationship.save();
    }

    res.status(200).json({ message: "Chặn người dùng thành công" });
  } catch (err) {
    console.log(`Lỗi chặn người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
};

export const unblockUser = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ message: "Yêu cầu userId" });
    }

    const from = req.user._id;
    const to = userId;

    const relationship = await Relationship.findOne({
      from, to, relationshipType: "block"
    })

    if (!relationship) {
      return res.status(400).json({ message: "Người dùng chưa bị chặn" });
    }

    await Relationship.deleteOne({ _id: relationship._id });

    res.status(200).json({ message: "Bỏ chặn người dùng thành công" });
  } catch (err) {
    console.log(`Lỗi bỏ chặn người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}

export const getBlockedUsers = async (req, res) => {
  const currentUserId = req.user._id;

  try {
    const blockedUsers = await Relationship.find({
      from: currentUserId,
      relationshipType: "block",
    });

    res.status(200).json(blockedUsers);
  } catch (err) {
    console.log(`Lỗi lấy thông tin người dùng: ${err.message}`);
    res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  }
}