// src/api/photoService.js

const CLOUD_NAME = "dy3kkwoli";
const UPLOAD_PRESET = "vistorias_preset";

export const photoService = {
  /**
   * Envia uma imagem única (Base64) para o Cloudinary
   */
  uploadFoto: async (base64) => {
    try {
      const formData = new FormData();
      formData.append("file", base64);
      formData.append("upload_preset", UPLOAD_PRESET);
      // Opcional: Adiciona uma tag para facilitar a busca no painel do Cloudinary
      formData.append("tags", "vistoria_vtr"); 

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Falha no servidor de imagens");
      }

      return data.secure_url; 
    } catch (error) {
      console.error("Erro no PhotoService (Single):", error);
      throw error;
    }
  },

  /**
   * Envia múltiplas fotos simultaneamente (Paralelismo)
   * Útil para o checklist de danos ou fotos gerais da VTR
   */
  uploadGaleria: async (listaBase64) => {
    try {
      // Cria uma promessa para cada foto para subir tudo de uma vez
      const promessas = listaBase64.map(foto => photoService.uploadFoto(foto));
      const urls = await Promise.all(promessas);
      return urls; // Retorna array de links: ["https://...", "https://..."]
    } catch (error) {
      console.error("Erro no PhotoService (Batch):", error);
      throw new Error("Uma ou mais imagens falharam no upload.");
    }
  }
};
