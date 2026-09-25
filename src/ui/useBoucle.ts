import { useEffect } from 'react';
import { useInterface } from './store';

/** Fait avancer le temps du jeu à chaque image. Les animations ne bloquent jamais ce rythme. */
export function useBoucle(): void {
  const avancer = useInterface((s) => s.avancer);
  useEffect(() => {
    let precedent = performance.now();
    let image = requestAnimationFrame(function boucle(maintenant) {
      // Au retour d'un autre onglet, on ne rattrape pas le temps perdu.
      const secondes = Math.min((maintenant - precedent) / 1000, 0.25);
      precedent = maintenant;
      avancer(secondes);
      image = requestAnimationFrame(boucle);
    });
    return () => cancelAnimationFrame(image);
  }, [avancer]);
}
