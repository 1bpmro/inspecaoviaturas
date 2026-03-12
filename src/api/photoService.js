// src/api/photoService.js

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
      // Garante que se o base64 for muito grande ou tiver caracteres especiais, 
      // ele seja tratado corretamente pelo FormData
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

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro detalhado do Cloudinary:", data);
        throw new Error(data.error?.message || "Falha no upload para o Cloudinary");
      }

      return data.secure_url; 
    } catch (error) {
      console.error("Erro no PhotoService:", error);
      throw error;
    }
  }
};
