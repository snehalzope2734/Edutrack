import api from "./axiosConfig";

export const cloudinaryApi = {
  getSignature: (folder, uploadPreset) =>
    api.post("/cloudinary/signature", { folder, uploadPreset }),

  uploadFile: async (file, folder = "edutrack/materials") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const { data } = await api.post("/cloudinary/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return data;
  },
};