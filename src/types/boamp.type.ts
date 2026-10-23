export interface BoampAnnonce {
  /** Identifiants de l'annonce */

  /** Identifiant BOAMP (ex. "15-31501") */
  idweb: string;
  /** Variante de l'ID (underscore remplaçant le tiret, ex. "15_31501") */
  id: string;
  /** ID dossier de marché (peut être null) */
  contractfolderid?: string | null;

  /** Métadonnées principales */

  /** Objet du marché / titre de l'avis */
  objet?: string;
  /** Code famille (ex. "JOUE", "FNS", "MAPA") */
  famille?: string;
  /** Libellé de la famille (ex. "Marchés européens") */
  famille_libelle?: string;
  /** Date de parution (format ISO 8601) */
  dateparution?: string;
  /** Date de fin de diffusion (ISO 8601) */
  datefindiffusion?: string;
  /** Date limite de réponse (ISO 8601) */
  datelimitereponse?: string;

  /** Autorité adjudicatrice et attribution */

  /** Nom de l'acheteur public */
  nomacheteur?: string;
  /** Nom du titulaire (si avis d'attribution) */
  titulaire?: string;

  /** Détails de la procédure */

  /** Périmètre/zone (ex. "FNSimple") */
  perimetre?: string;
  /** Code du type de procédure */
  type_procedure?: string;
  /** Sous-type de procédure */
  soustype_procedure?: string;
  /** Libellé de la procédure (forme lisible) */
  procedure_libelle?: string;
  /** Code de catégorisation de la procédure */
  procedure_categorise?: string;
  /** Type de marché (ex. "APPEL_OFFRE") */
  nature?: string;
  /** Sous-type (sous-nature) éventuel */
  sousnature?: string;
  /** Libellé de la nature */
  nature_libelle?: string;
  /** Libellé de la sous-nature */
  sousnature_libelle?: string;
  /** Code de catégorisation de la nature */
  nature_categorise?: string;
  /** Libellé de cette catégorisation */
  nature_categorise_libelle?: string;

  /** Catégorisation et critères */

  /** Critères de sélection (codes CPV, etc.) */
  criteres?: string;
  /** Indicateur de marché simplifié (ex. "1" ou "0") */
  marche_public_simplifie?: string;
  /** Libellé du statut simplifié */
  marche_public_simplifie_label?: string;
  /** Type de marché (FOURNITURES, SERVICES, etc.) */
  type_marche?: string;
  /** Catégorie de marché (identique au type) */
  type_marche_facette?: string;
  /** Type d'avis (Avis d'appel d'offres, etc.) */
  type_avis?: string;
  /** État actuel de l'annonce (ex. "1" pour active) */
  etat?: string;
  /** Code du domaine d'activité */
  descripteur_code?: string;
  /** Libellé du domaine (secteur) */
  descripteur_libelle?: string;

  /** Localisation */

  /** Code département de l'acheteur */
  code_departement?: string;
  /** Département de la prestation */
  code_departement_prestation?: string;

  /** Références externes */

  /** IDWEB d'un avis lié (ex. avis modificatif lié) */
  annonce_lie?: string;
  /** IDWEB d'avis antérieurs (ex. pour modifications) */
  annonces_anterieures?: string;

  /** Autres champs divers */

  /** URL du détail de l'avis sur BOAMP */
  url_avis?: string;
  /** Identifiant interne de gestion */
  gestion?: string;
  /** Détails complets (section <DONNEES> du flux XML, si présent) */
  donnees?: string;
}