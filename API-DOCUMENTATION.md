# Cahier des Charges - API CERC-SPOT

## Description generale

CERC-SPOT est une API de traitement des annonces de marches publics francaises. Elle recupere les documents BOAMP (Bulletin Officiel des Annonces des Marches Publics) et les donnees DECP (Donnees Essentielles de la Commande Publique), puis utilise des agents IA pour extraire des donnees structurees (operation, lieu, montant, maitre d'ouvrage, secteur d'activite) et estimer des montants par similarite vectorielle.

---

## Authentification

Toutes les routes (sauf `/health`) necessitent une authentification **Bearer Token**.

```
Authorization: Bearer <API_TOKEN>
```

---

## URL de base

```
https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud
```

---

## Endpoints

### 1. Health Check

**`GET /health`**

Verifie que l'API est operationnelle.

| Authentification | Non requise |
|------------------|-------------|

**Reponse succes (200):**
```json
{
  "status": "ok"
}
```

---

### 2. Extraction de donnees BOAMP

**`POST /extract-from-boamp`**

Recupere les documents BOAMP selon les criteres fournis et extrait les informations structurees via un agent IA.

| Authentification | Bearer Token requis |
|------------------|---------------------|

#### Parametres (body JSON)

| Parametre | Type | Requis | Defaut | Description |
|-----------|------|--------|--------|-------------|
| `dateDebut` | string | Oui | - | Date de debut de recherche. **Format: YYYY-MM-DD** |
| `dateFin` | string | Oui | - | Date de fin de recherche. **Format: YYYY-MM-DD** |
| `codeDepartement` | string | Non | `"973"` | Code departement (2 ou 3 chiffres). Ex: `"75"`, `"973"` |
| `boampId` | string | Non | - | ID specifique d'un document BOAMP (filtre sur un seul document) |
| `rows` | number | Non | `100` | Nombre maximum de documents a recuperer (entier positif) |
| `offset` | number | Non | `0` | Offset pour la pagination (entier non-negatif) |

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/extract-from-boamp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "dateDebut": "2024-01-01",
    "dateFin": "2024-01-31",
    "codeDepartement": "973",
    "rows": 50
  }'
```

#### Reponse succes (200)

```json
{
  "success": true,
  "totalCount": 150,
  "processed": 50,
  "results": [
    {
      "idweb": "24-12345",
      "success": true,
      "result": {
        "operation": "Construction d'un groupe scolaire",
        "lieuExecution": {
          "lieuExecutionId": 4,
          "lieuExecutionNom": "Cayenne"
        },
        "montant": 1500000,
        "acheteur": {
          "idMoa": 42,
          "nomAcheteurOriginal": "Commune de Cayenne",
          "descripteur_code": ["843", "752"]
        },
        "typeOperation": {
          "typeMarche": "TRAVAUX",
          "sector": "LOG",
          "sousSecteur": "NEUF"
        },
        "allotissement": null,
        "confidence": 85
      },
      "record": {
        "idweb": "24-12345",
        "gestion": { "...": "..." },
        "donnees": { "...": "..." }
      }
    },
    {
      "idweb": "24-12346",
      "success": false,
      "error": "Failed to parse agent response"
    }
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes global du traitement |
| `totalCount` | number | Nombre total de documents correspondant aux criteres dans BOAMP |
| `processed` | number | Nombre de documents effectivement traites |
| `results` | array | Liste des resultats par document |
| `results[].idweb` | string | Identifiant BOAMP du document |
| `results[].success` | boolean | Succes de l'extraction pour ce document |
| `results[].result` | object | Objet JSON contenant les donnees extraites (voir structure ci-dessous) |
| `results[].record` | object | Document BOAMP d'origine tel que recupere depuis l'API BOAMP (champs `gestion` et `donnees` parses en JSON) |
| `results[].error` | string | Message d'erreur si `success: false` |

#### Structure des donnees extraites (champ `result`)

Le champ `result` est un objet JSON avec la structure suivante :

```json
{
  "operation": "Description de l'operation/marche",
  "lieuExecution": {
    "lieuExecutionId": 4,
    "lieuExecutionNom": "Cayenne"
  },
  "montant": 1500000,
  "acheteur": {
    "idMoa": 42,
    "nomAcheteurOriginal": "Nom de l'acheteur tel qu'indique dans le BOAMP",
    "descripteur_code": ["84.11Z", "75.11Z"]
  },
  "typeOperation": {
    "typeMarche": "TRAVAUX",
    "sector": "LOG",
    "sousSecteur": "NEUF"
  },
  "allotissement": {
    "lots": [
      {
        "lotId": "1",
        "nom": "Gros oeuvre",
        "entrepriseAttributaire": "Entreprise XYZ",
        "dateAttribution": "2024-01-15",
        "montant": 500000
      }
    ]
  },
  "confidence": 85
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `operation` | string | Objet/titre du marche |
| `lieuExecution` | object | Lieu d'execution du marche |
| `lieuExecution.lieuExecutionId` | number ou null | ID de la localite d'execution (correspondance referentiel interne des localites) |
| `lieuExecution.lieuExecutionNom` | string ou null | Nom de la localite d'execution (derive du referentiel interne) |
| `montant` | number ou null | Montant du marche en euros |
| `acheteur` | object | Informations sur l'acheteur |
| `acheteur.idMoa` | number ou null | ID du Maitre d'Ouvrage (correspondance referentiel interne) |
| `acheteur.nomAcheteurOriginal` | string | Nom de l'acheteur extrait du document BOAMP |
| `acheteur.descripteur_code` | string[] ou null | Codes descripteurs de l'acheteur (extrait du champ `descripteur_code` du document BOAMP) |
| `typeOperation` | object | Classification du marche |
| `typeOperation.typeMarche` | string | Type de marche : `TRAVAUX`, `SERVICES` ou `FOURNITURES` |
| `typeOperation.sector` | string ou null | Secteur d'activite, depend du type de marche (voir tableau ci-dessous) |
| `typeOperation.sousSecteur` | string ou null | Sous-secteur d'activite, depend du secteur (voir tableau ci-dessous) |
| `allotissement` | object ou null | Details des lots (uniquement pour les attributions) |
| `allotissement.lots` | array | Liste des lots |
| `allotissement.lots[].lotId` | string | Identifiant du lot |
| `allotissement.lots[].nom` | string | Intitule/description du lot |
| `allotissement.lots[].entrepriseAttributaire` | string | Nom de l'entreprise attributaire |
| `allotissement.lots[].dateAttribution` | string | Date d'attribution (YYYY-MM-DD) |
| `allotissement.lots[].montant` | number | Montant du lot en euros |
| `confidence` | number | Niveau de confiance de l'extraction (0-100) |

#### Referentiel types de marche / secteurs / sous-secteurs

La classification suit une hierarchie a trois niveaux : **type de marche -> secteur -> sous-secteur**.

| Type de marche | Secteur | Sous-secteurs |
|----------------|---------|---------------|
| **TRAVAUX** | `LOG` (Logement) | Neuf, Rehabilitation, Deconstruction |
| **TRAVAUX** | `TP` (Travaux Public) | Route, Reseau, Terrassement, Ouvrage d'art |
| **TRAVAUX** | `BNR` (Batiment non residentiel) | Neuf, Maintenance, Deconstruction |
| **SERVICES** | Geotechnique | Geotechnique |
| **SERVICES** | Environnementale | Environnementale |
| **SERVICES** | Audit & controle | Audit & controle |
| **SERVICES** | Maitrise d'oeuvre (MOE) | Maitrise d'oeuvre (MOE) |
| **SERVICES** | Assistance a MOA (AMO) | Assistance a MOA (AMO) |
| **SERVICES** | Prestation intellectuelle collectivite | Prestation intellectuelle collectivite |
| **FOURNITURES** | Approvisionnements | Approvisionnements |

#### Reponse erreur - Parametres invalides (400)

```json
{
  "error": "Invalid request parameters",
  "details": {
    "dateDebut": ["Format attendu: YYYY-MM-DD"],
    "codeDepartement": ["Code departement invalide (2 ou 3 chiffres)"]
  }
}
```

#### Reponse erreur - Echec recuperation BOAMP (502)

```json
{
  "error": "Failed to process documents",
  "details": "Connection timeout"
}
```

---

### 3. Chargement des embeddings BOAMP

**`POST /load-boamp`**

Recupere les documents BOAMP, genere une description IA pour chacun, cree les embeddings Mistral et les stocke dans PGVector (table `boamp_embeddings`).

| Authentification | Bearer Token requis |
|------------------|---------------------|

#### Parametres (body JSON)

| Parametre | Type | Requis | Defaut | Description |
|-----------|------|--------|--------|-------------|
| `dateDebut` | string | Oui | - | Date de debut de recherche. **Format: YYYY-MM-DD** |
| `dateFin` | string | Oui | - | Date de fin de recherche. **Format: YYYY-MM-DD** |
| `codeDepartement` | string | Non | `"973"` | Code departement (2 ou 3 chiffres) |
| `boampId` | string | Non | - | ID specifique d'un document BOAMP |
| `rows` | number | Non | `100` | Nombre de documents par page (entier positif) |
| `offset` | number | Non | `0` | Offset pour la pagination (entier non-negatif) |

**Mode de pagination :** Si `rows` et `offset` sont fournis, une seule page est traitee. Sinon, toutes les pages sont parcourues automatiquement.

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/load-boamp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "dateDebut": "2024-01-01",
    "dateFin": "2024-01-31",
    "codeDepartement": "973"
  }'
```

#### Reponse succes (200)

```json
{
  "success": true,
  "totalFetched": 150,
  "totalStored": 148,
  "errors": 2
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes global du traitement |
| `totalFetched` | number | Nombre total de documents BOAMP recuperes |
| `totalStored` | number | Nombre de documents dont l'embedding a ete stocke en base |
| `errors` | number | Nombre d'erreurs lors du traitement |

#### Reponse erreur - Parametres invalides (400)

```json
{
  "error": "Invalid request parameters",
  "details": {
    "dateDebut": ["Format attendu: YYYY-MM-DD"]
  }
}
```

#### Reponse erreur - Echec traitement (502)

```json
{
  "error": "Failed to process BOAMP data",
  "details": "Connection timeout"
}
```

---

### 4. Chargement des embeddings DECP

**`POST /load-decp`**

Recupere les enregistrements DECP jour par jour sur la periode donnee, filtre ceux situes en Guyane (via un agent IA), genere les descriptions et embeddings, puis les stocke dans PGVector (table `decp_embeddings`).

| Authentification | Bearer Token requis |
|------------------|---------------------|

#### Parametres (body JSON)

| Parametre | Type | Requis | Defaut | Description |
|-----------|------|--------|--------|-------------|
| `dateDebut` | string | Oui | - | Date de debut de recherche. **Format: YYYY-MM-DD** |
| `dateFin` | string | Oui | - | Date de fin de recherche. **Format: YYYY-MM-DD** |

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/load-decp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "dateDebut": "2024-01-01",
    "dateFin": "2024-01-31"
  }'
```

#### Reponse succes (200)

```json
{
  "success": true,
  "totalFetched": 5000,
  "totalGuyane": 42,
  "totalStored": 40,
  "errors": 2
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes global du traitement |
| `totalFetched` | number | Nombre total d'enregistrements DECP recuperes (toutes regions) |
| `totalGuyane` | number | Nombre d'enregistrements identifies comme situes en Guyane |
| `totalStored` | number | Nombre d'enregistrements dont l'embedding a ete stocke en base |
| `errors` | number | Nombre d'erreurs lors du traitement |

#### Reponse erreur - Parametres invalides (400)

```json
{
  "error": "Invalid request parameters",
  "details": {
    "dateDebut": ["Format attendu: YYYY-MM-DD"]
  }
}
```

#### Reponse erreur - Echec traitement (502)

```json
{
  "error": "Failed to process DECP data",
  "details": "Connection timeout"
}
```

---

### 5. Estimation de montant par similarite DECP

**`POST /boamp-estimate`**

A partir d'un ID BOAMP, genere une description IA du projet, puis recherche les DECP les plus similaires dans PGVector (distance cosinus, seuil < 0.1, limite 10 resultats) et retourne la moyenne de leurs montants.

| Authentification | Bearer Token requis |
|------------------|---------------------|

#### Parametres (body JSON)

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `boampId` | string | Oui | Identifiant BOAMP du document (ex: `"24-12345"`). Chaine non vide. |
| `codeCpv` | string | Non | Code CPV pour filtrer les DECP avant la recherche de similarite |

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/boamp-estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "boampId": "24-12345",
    "codeCpv": "45210000"
  }'
```

#### Reponse succes (200)

```json
{
  "success": true,
  "boampId": "24-12345",
  "boampDescription": "Construction d'un groupe scolaire de 12 classes...",
  "averageMontant": 1850000,
  "similarDecp": [
    {
      "decpId": "decp-001",
      "description": "Marche de travaux portant sur la construction...",
      "montant": 2000000,
      "distance": 0.05
    },
    {
      "decpId": "decp-002",
      "description": "Realisation d'un equipement scolaire...",
      "montant": 1700000,
      "distance": 0.08
    }
  ]
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes du traitement |
| `boampId` | string | Identifiant BOAMP du document traite |
| `boampDescription` | string | Description generee par l'agent IA |
| `averageMontant` | number ou undefined | Moyenne des montants des DECP similaires (exclut les montants null). Absent si aucun resultat |
| `similarDecp` | array | Les DECP les plus similaires (max 10, distance < 0.1) |
| `similarDecp[].decpId` | string | Identifiant DECP |
| `similarDecp[].description` | string | Description du marche DECP |
| `similarDecp[].montant` | number ou null | Montant du marche en euros |
| `similarDecp[].distance` | number | Distance cosinus (0 = identique). Toujours < 0.1 |

#### Reponse erreur - Parametres invalides (400)

```json
{
  "error": "Invalid request parameters",
  "details": {
    "boampId": ["boampId est requis"]
  }
}
```

#### Reponse erreur - BOAMP non trouve ou echec (502)

```json
{
  "error": "Failed to estimate BOAMP",
  "details": "BOAMP record not found"
}
```

---

## Codes d'erreur HTTP

| Code | Signification |
|------|---------------|
| 200 | Succes |
| 400 | Parametres de requete invalides (validation Zod) |
| 401 | Token d'authentification manquant ou invalide |
| 404 | Route non trouvee |
| 500 | Erreur interne du serveur |
| 502 | Erreur lors de la recuperation ou du traitement des donnees en amont (BOAMP, DECP, PGVector) |

### Format des reponses d'erreur

**Authentification echouee (401):**
```json
{
  "message": "Unauthorized"
}
```

**Route non trouvee (404):**
```json
{
  "error": "Not found"
}
```

**Erreur serveur (500):**
```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

## Notes techniques

- **Retry automatique**: Les appels a l'API BOAMP, a l'API DECP et au service d'embeddings beneficient d'un mecanisme de retry avec backoff exponentiel (3 tentatives, multiplicateur x2, delai initial 30s)
- **Pagination**: Utilisez `rows` et `offset` pour paginer les resultats si `totalCount` depasse `rows`
- **Performance**: Les documents sont traites sequentiellement, prevoir un temps de reponse proportionnel au nombre de documents
- **Embeddings**: Modele Mistral (`mistral-embed`), 1024 dimensions, traites par batchs de 50
- **Recherche vectorielle**: Distance cosinus via PGVector, index IVFFlat (100 listes), seuil de similarite < 0.1
- **Filtrage Guyane (DECP)**: Les enregistrements dont `lieuexecution_code` vaut `"973"` sont directement inclus ; les autres sont evalues par un agent IA