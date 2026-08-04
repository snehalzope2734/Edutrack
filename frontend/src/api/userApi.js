import api from "./axiosConfig";

export const userApi = {
  me: () => api.get("/users/me"),
  updateProfilePhoto: (cloudinaryUrl, cloudinaryPublicId) =>
    api.put("/users/me/profile-photo", { cloudinaryUrl, cloudinaryPublicId }),
};
