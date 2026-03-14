import { useState, useEffect } from "react";
import { getItemImages, type ItemImage } from "../services/imageService";

export function useItemImages(itemId: string) {
  const [images, setImages] = useState<ItemImage[]>([]);

  useEffect(() => {
    getItemImages(itemId).then(setImages);
  }, [itemId]);

  return { images };
}
