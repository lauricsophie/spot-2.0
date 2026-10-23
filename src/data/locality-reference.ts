export interface LocalityReference {
  id: number;
  nom: string;
  nom_boamp: string[];
  communaute?: string;
}

export const localityReferences: LocalityReference[] = [
  {
    id: 1,
    nom: "Apatou",
    nom_boamp: ["APATOU"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 2,
    nom: "Awala-Yalimapo",
    nom_boamp: ["Awala-Yalimapo"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 3,
    nom: "Camopi",
    nom_boamp: ["Camopi"],
    communaute: "Communauté de Communes de l'Est guyanais",
  },
  {
    id: 4,
    nom: "Cayenne",
    nom_boamp: ["CAYENNE", "Cayenne cedex", "CAYENNE DEDEX"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 5,
    nom: "Grand-Santi",
    nom_boamp: ["Grand-Santi"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 6,
    nom: "Iracoubo",
    nom_boamp: ["Iracoubo"],
    communaute: "Communauté de Communes des Savanes",
  },
  {
    id: 7,
    nom: "Kourou",
    nom_boamp: ["KOUROU", "Kourou cedex", "97310 kourou", "97310 Kourou, Guyane française"],
    communaute: "Communauté de Communes des Savanes",
  },
  {
    id: 8,
    nom: "Macouria",
    nom_boamp: ["Macouria - GUYANE", "Macouria"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 9,
    nom: "Mana",
    nom_boamp: ["Mana"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 10,
    nom: "Maripasoula",
    nom_boamp: ["Maripa-Soula"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 11,
    nom: "Matoury",
    nom_boamp: ["Matoury cedex"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 12,
    nom: "Montsinery-Tonnegrande",
    nom_boamp: ["Montsinery-Tonnegrande"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 13,
    nom: "Ouanary",
    nom_boamp: ["Ouanary"],
    communaute: "Communauté de Communes de l'Est guyanais",
  },
  {
    id: 14,
    nom: "Papaïchton",
    nom_boamp: ["Papaïchton"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 15,
    nom: "Regina",
    nom_boamp: ["Regina"],
    communaute: "Communauté de Communes de l'Est guyanais",
  },
  {
    id: 16,
    nom: "Rémire-Montjoly",
    nom_boamp: ["REMIRE MONTJOLY", "Rémire-Montjoly", "Remire-Montojly"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 17,
    nom: "Roura",
    nom_boamp: ["Roura"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  {
    id: 18,
    nom: "Saint-Elie",
    nom_boamp: ["Saint-Elie"],
    communaute: "Communauté de Communes des Savanes",
  },
  {
    id: 19,
    nom: "Saint-Georges",
    nom_boamp: ["Saint Georges", "Saint Georges de l'Oyapock"],
    communaute: "Communauté de Communes de l'Est guyanais",
  },
  {
    id: 20,
    nom: "Saint-Laurent-du-Maroni",
    nom_boamp: ["SAINT LAURENT DU MARONI", "SAINT LAURENT DU MARONI Cedex", "Saint-Laurent du Maroni", "St laurent du maroni"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 21,
    nom: "Saül",
    nom_boamp: ["Saül"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 22,
    nom: "Sinnamary",
    nom_boamp: ["Sinnamary"],
    communaute: "Communauté de Communes des Savanes",
  },
  { id: 23, nom: "Guyane", nom_boamp: ["Guyane"], communaute: "Guyane" },
  {
    id: 24,
    nom: "Haut-Maroni",
    nom_boamp: ["Haut-Maroni"],
    communaute: "Communauté de Communes de l'Ouest guyanais",
  },
  {
    id: 26,
    nom: "Littoral",
    nom_boamp: ["Littoral"],
    communaute: "Communauté d'Agglomération du Centre Litoral",
  },
  { id: 38, nom: "Oyapock", nom_boamp: ["Oyapock"] },
  { id: 657, nom: "À choisir", nom_boamp: ["À choisir"] },
  { id: 658, nom: "CACL", nom_boamp: ["CACL"] },
  { id: 659, nom: "CCDS", nom_boamp: ["CCDS"] },
  { id: 660, nom: "CCOG", nom_boamp: ["CCOG"] },
  { id: 661, nom: "CCEG", nom_boamp: ["CCEG"] },
];

export function getLocalityReferenceText(): string {
  return JSON.stringify(localityReferences);
}

export function getLocalityReferenceNameFromId(localityId: number | null): string | null {
  return localityId != null
    ? localityReferences.find(l => l.id === localityId)?.nom ?? null
    : null;
}