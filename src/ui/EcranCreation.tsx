import { useState, type FormEvent } from 'react';
import { AVATARS, trouverAvatar } from '../content/avatars';
import { LIMITES_NOMS, PARTIE_PAR_DEFAUT } from '../content/partie';
import { TEXTES } from '../content/textes';
import { nettoyerNom, validerNomMaison, validerPrenom, type ErreurNom } from '../engine/identite';
import { Avatar } from '../scene/Avatar';
import { EnseigneNeon } from '../scene/EnseigneNeon';
import { useInterface } from './store';

const t = TEXTES.creation;

function messageErreur(champ: 'prenom' | 'maison', erreur: ErreurNom | null): string | null {
  if (!erreur) return null;
  const messages = t.erreurs[champ];
  return erreur === 'long' ? messages.long(LIMITES_NOMS[champ]) : messages[erreur];
}

/** Garde le champ visible au-dessus du clavier du téléphone. */
function montrerChamp(e: { currentTarget: HTMLElement }) {
  const champ = e.currentTarget;
  setTimeout(() => champ.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
}

export function EcranCreation() {
  const creerPartie = useInterface((s) => s.creerPartie);
  const retourTitre = useInterface((s) => s.retourTitre);

  const [avatar, setAvatar] = useState(PARTIE_PAR_DEFAUT.avatar);
  const [tenue, setTenue] = useState(0);
  const [prenom, setPrenom] = useState('');
  const [nomMaison, setNomMaison] = useState(PARTIE_PAR_DEFAUT.nomMaison);
  const [prenomTouche, setPrenomTouche] = useState(false);

  const erreurPrenom = validerPrenom(prenom);
  const erreurMaison = validerNomMaison(nomMaison);
  // Le prénom vide n'est signalé qu'après une première tentative ou une sortie du champ.
  const messagePrenom = prenomTouche || erreurPrenom !== 'vide' ? messageErreur('prenom', erreurPrenom) : null;
  const messageMaison = messageErreur('maison', erreurMaison);
  const enseigne = nettoyerNom(nomMaison);

  const valider = (e: FormEvent) => {
    e.preventDefault();
    setPrenomTouche(true);
    if (erreurPrenom || erreurMaison) return;
    creerPartie({ prenom, avatar, tenue, nomMaison });
  };

  return (
    <form className="ecran-creation" onSubmit={valider} noValidate>
      <section className="creation-avatars">
        <h1>{t.titre}</h1>
        <div className="grille-avatars" role="radiogroup" aria-label={t.titre}>
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={a.id === avatar}
              aria-label={a.nom}
              className={a.id === avatar ? 'choix-avatar choisi' : 'choix-avatar'}
              onClick={() => setAvatar(a.id)}
            >
              <Avatar avatar={a.id} tenue={a.id === avatar ? tenue : 0} taille={56} />
            </button>
          ))}
        </div>
        <p className="nom-avatar">{trouverAvatar(avatar).nom}</p>
        <div className="choix-tenue" role="radiogroup" aria-label="Tenue">
          {[0, 1].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={tenue === n}
              className={tenue === n ? 'bouton principal' : 'bouton discret'}
              onClick={() => setTenue(n)}
            >
              {t.tenue(n + 1)}
            </button>
          ))}
        </div>
      </section>

      <section className="creation-champs">
        <label className="champ">
          <span>{t.prenom}</span>
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            onBlur={() => setPrenomTouche(true)}
            onFocus={montrerChamp}
            placeholder={t.prenomExemple}
            maxLength={LIMITES_NOMS.prenom + 4}
            autoComplete="off"
            autoCapitalize="words"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={messagePrenom !== null}
          />
          {messagePrenom && <em className="erreur">{messagePrenom}</em>}
        </label>
        <label className="champ">
          <span>{t.maison}</span>
          <input
            value={nomMaison}
            onChange={(e) => setNomMaison(e.target.value)}
            onFocus={montrerChamp}
            maxLength={LIMITES_NOMS.maison + 4}
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            aria-invalid={messageMaison !== null}
          />
          {messageMaison && <em className="erreur">{messageMaison}</em>}
        </label>
        <div className="apercu-enseigne">
          <span>{t.apercu}</span>
          <EnseigneNeon texte={enseigne || '…'} eteinte={erreurMaison !== null} />
        </div>
        <div className="carte-actions">
          <button type="button" className="bouton discret" onClick={retourTitre}>
            {t.retour}
          </button>
          <button type="submit" className="bouton principal">
            {t.valider}
          </button>
        </div>
      </section>
    </form>
  );
}
