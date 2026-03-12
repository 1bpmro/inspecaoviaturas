const CLOUD_NAME = "dy3kkwoli";
const UPLOAD_PRESET = "vistorias_preset";

export const photoService = {
  /**
   * Envia uma imagem em Base64 para o Cloudinary
   * @param {string} base64 - A imagem capturada pela câmera
   * @returns {string} - A URL segura da imagem hospedada
   */
  uploadFoto: async (base64) => {
    try {
      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Falha no upload para o Cloudinary");

      const data = await response.json();
      return data.secure_url; // Esta é a URL que salvaremos no Firestore
    } catch (error) {
      console.error("Erro no PhotoService:", error);
      throw error;
    }
  }
};
