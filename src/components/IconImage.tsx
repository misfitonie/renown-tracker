interface IconImageProps {
  image?: string;
  emoji: string;
  className?: string;     // classes de l'emoji (taille de police)
  imageClassName: string; // classes de l'image (largeur/hauteur)
}

// Affiche l'image importée si présente, sinon l'emoji
export function IconImage({ image, emoji, className = '', imageClassName }: IconImageProps) {
  if (image) {
    return <img src={image} alt="" className={`${imageClassName} rounded-full object-cover flex-shrink-0`} />;
  }
  return <span className={className}>{emoji}</span>;
}
