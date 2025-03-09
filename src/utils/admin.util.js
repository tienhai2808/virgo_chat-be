import cloudinary from "../config/cloudinary.js";

export const countImagesInFolder = async (folder) => {
  let count = 0;
  let nextCursor = null;
  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: folder,
      max_results: 100,
      next_cursor: nextCursor,
    });

    count += result.resources.length;
    nextCursor = result.next_cursor;
  } while (nextCursor);

  return count;
};
