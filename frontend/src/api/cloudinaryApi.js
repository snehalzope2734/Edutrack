import api from "./axiosConfig";

export const cloudinaryApi = {
  getSignature: (folder, uploadPreset) =>
    api.post("/cloudinary/signature", { folder, uploadPreset }),

  uploadFile: async (file, folder, uploadPreset) => {
    const { data: sig } = await cloudinaryApi.getSignature(
      folder,
      uploadPreset
    );

    const form = new FormData();

    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", sig.timestamp);
    form.append("signature", sig.signature);
    form.append("folder", folder);
    form.append("upload_preset", uploadPreset);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`,
      {
        method: "POST",
        body: form,
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Cloudinary upload error:", error);
      throw new Error("Cloudinary upload failed");
    }

    const data = await res.json();

    console.log("Cloudinary upload response:", data);
    console.log("Resource type:", data.resource_type);
    console.log("Format:", data.format);
    console.log("Secure URL:", data.secure_url);
    console.log("Bytes:", data.bytes);

    return data;
  },
};