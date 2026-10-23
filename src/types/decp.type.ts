/** Montant global d'un contrat (marché ou concession). */
export interface Montant {
  /** Montant total du contrat (valeur globale minimale). */
  valeurGlobale: number;
  /** Devise utilisée (ex. « EUR »). */
  devise: string;
  /** Pour les concessions : montant minimum prévu (si applicable). */
  montantMinimum?: number;
  /** Pour les concessions : montant maximum prévu (si applicable). */
  montantMaximum?: number;
  /** Montant estimé prévisionnel (si renseigné). */
  montantPrevisionnel?: number;
}

/** Dates et durée du contrat. */
export interface Dates {
  /** Date de notification (attribution du marché). */
  dateNotification?: string;
  /** Date de fin de contrat (achevée ou prévue). */
  dateFin?: string;
  /** Durée d'exécution en mois. */
  dureeMois?: number;
  /** Durée d'exécution en années (entier). */
  dureeAnnees?: number;
}

/** Type de procédure d'attribution. */
export interface Procedure {
  /** Code ou libellé de la procédure (ex. « appel d'offres », « procédure adaptée », etc.). */
  type: string;
  /** Spécialité éventuelle (ex. procédure sans publicité). */
  specialite?: string;
}

/** Acheteur public (mandataire ou groupement). */
export interface Acheteur {
  /** Numéro SIREN de l'acheteur. */
  siren: string;
  /** Raison sociale ou nom de l'acheteur. */
  nom: string;
  /** Nature juridique ou catégorie (ex. « Collectivité territoriale »). */
  nature?: string;
  /** Catégorie d'acheteur (ex. « Central », « Local »). */
  categorie?: string;
  /** Code postal du siège. */
  codePostal?: string;
  /** Commune du siège. */
  commune?: string;
  /** Latitude (décimale) du siège. */
  latitude?: number;
  /** Longitude (décimale) du siège. */
  longitude?: number;
}

/** Titulaire d'un marché public. */
export interface Titulaire {
  /** Numéro SIREN du titulaire. */
  siren: string;
  /** Raison sociale du titulaire. */
  nom: string;
  /** Code NAF/APE du titulaire (secteur d'activité principal). */
  naf?: string;
  /** Part minimale contractuelle (pour groupement). */
  partMin?: number;
  /** Part maximale contractuelle (pour groupement). */
  partMax?: number;
}

/** Concessionnaire d'un contrat de concession. */
export interface Concessionnaire {
  /** Numéro SIREN du concessionnaire. */
  siren: string;
  /** Raison sociale du concessionnaire. */
  nom: string;
  /** Code NAF/APE du concessionnaire. */
  naf?: string;
}

/** Structure principale d'un enregistrement DECP (marché public ou concession). */
export interface DecpAnnonce {
  [key: string]: unknown;
  /** Identifiant unique du marché/contrat (selon le schéma). */
  id: string;
  /** Objet sommaire du marché (description). */
  objet?: string;
  /** Référence du contrat-cadre associé (si applicatif) : ID facultatif. */
  idAccordCadre?: string;
  /** Montant global du contrat. */
  montant: Montant;
  /** Dates et durée du contrat. */
  dates: Dates;
  /** Informations sur la procédure d'attribution. */
  procedure?: Procedure;
  /** Informations sur l'acheteur public (mandataire). */
  acheteur: Acheteur;
  /** Liste des titulaires (entreprises attributaires) du marché. */
  titulaires?: Titulaire[];
  /** Liste des concessionnaires (pour les contrats de concession). */
  concessionnaires?: Concessionnaire[];
  /** Indique si le marché comporte des actes de sous-traitance (true/false). */
  actesSousTraitance?: boolean;
  /** Indique s'il existe au moins un acte de sous-traitance (true/false). */
  acteSousTraitance?: boolean;
  /** Indique si une avance a été attribuée (true/false). */
  attributionAvance?: boolean;
  /** Taux de l'avance (%), si `attributionAvance=true`. */
  tauxAvance?: number;
  /** Code du lieu d'exécution (ex. code département "973"). */
  lieuexecution_code?: string;
  /** Nom du lieu d'exécution (ex. "Guyane"). */
  lieuexecution_nom?: string;
  /** Type de code du lieu d'exécution (ex. "Code département"). */
  lieuexecution_typecode?: string;
  /** Code CPV principal (Classification des Produits et Services). */
  codecpv?: string;
}