# Documentation API CERC-SPOT

## Presentation

L'API CERC-SPOT permet d'exploiter les donnees des marches publics francais. Elle propose deux fonctionnalites principales :

- **Extraction structuree** : a partir des annonces BOAMP, extraction automatique des informations cles (operation, lieu, montant, maitre d'ouvrage, secteur d'activite)
- **Estimation de montant** : a partir d'un identifiant BOAMP, estimation du montant d'un marche par comparaison avec des marches similaires issus des DECP

---

## Authentification

Toutes les requetes (sauf `/health`) necessitent un header d'authentification :

```
Authorization: Bearer <VOTRE_TOKEN>
```

---

## URL de base

```
https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud
```

---

## Endpoints

### 1. Verification de disponibilite

**`GET /health`**

Verifie que l'API est operationnelle. Aucune authentification requise.

#### Reponse (200)

```json
{
  "status": "ok"
}
```

---

### 2. Extraction de donnees BOAMP

**`POST /extract-from-boamp`**

Recupere les documents BOAMP correspondant aux criteres fournis et extrait les informations structurees via une analyse IA.

#### Parametres (body JSON)

| Parametre | Type | Requis | Defaut | Description |
|-----------|------|--------|--------|-------------|
| `dateDebut` | string | Oui | - | Date de debut de recherche. **Format : YYYY-MM-DD** |
| `dateFin` | string | Oui | - | Date de fin de recherche. **Format : YYYY-MM-DD** |
| `codeDepartement` | string | Non | `"973"` | Code departement (2 ou 3 chiffres). Ex : `"75"`, `"973"` |
| `boampId` | string | Non | - | Identifiant specifique d'un document BOAMP pour ne traiter que celui-ci |
| `rows` | number | Non | `100` | Nombre maximum de documents a recuperer |
| `offset` | number | Non | `0` | Decalage pour la pagination des resultats |

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/extract-from-boamp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTRE_TOKEN>" \
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

#### Description des champs de reponse

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes global du traitement |
| `totalCount` | number | Nombre total de documents correspondant aux criteres dans le BOAMP |
| `processed` | number | Nombre de documents effectivement traites |
| `results` | array | Liste des resultats par document |
| `results[].idweb` | string | Identifiant BOAMP du document |
| `results[].success` | boolean | Succes de l'extraction pour ce document |
| `results[].result` | object | Donnees extraites (voir ci-dessous) |
| `results[].record` | object | Document BOAMP brut d'origine |
| `results[].error` | string | Message d'erreur si `success: false` |

#### Structure des donnees extraites (`result`)

| Champ | Type | Description |
|-------|------|-------------|
| `operation` | string | Objet / titre du marche |
| `lieuExecution.lieuExecutionId` | number ou null | Identifiant interne de la localite |
| `lieuExecution.lieuExecutionNom` | string ou null | Nom de la localite |
| `montant` | number ou null | Montant du marche en euros |
| `acheteur.idMoa` | number ou null | Identifiant interne du maitre d'ouvrage |
| `acheteur.nomAcheteurOriginal` | string | Nom de l'acheteur tel qu'indique dans le BOAMP |
| `acheteur.descripteur_code` | string[] ou null | Codes descripteurs de l'acheteur |
| `typeOperation.typeMarche` | string | `TRAVAUX`, `SERVICES` ou `FOURNITURES` |
| `typeOperation.sector` | string ou null | Secteur d'activite (voir referentiel ci-dessous) |
| `typeOperation.sousSecteur` | string ou null | Sous-secteur d'activite |
| `allotissement` | object ou null | Details des lots (uniquement pour les attributions) |
| `allotissement.lots[].lotId` | string | Identifiant du lot |
| `allotissement.lots[].nom` | string | Intitule du lot |
| `allotissement.lots[].entrepriseAttributaire` | string | Entreprise attributaire |
| `allotissement.lots[].dateAttribution` | string | Date d'attribution (YYYY-MM-DD) |
| `allotissement.lots[].montant` | number | Montant du lot en euros |
| `confidence` | number | Niveau de confiance de l'extraction (0 a 100) |

#### Referentiel des secteurs et sous-secteurs

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

#### Pagination

Si `totalCount` est superieur a `rows`, utilisez le parametre `offset` pour recuperer les pages suivantes :

- Page 1 : `rows: 100, offset: 0`
- Page 2 : `rows: 100, offset: 100`
- Page 3 : `rows: 100, offset: 200`

---

### 3. Estimation de montant

**`POST /boamp-estimate`**

A partir d'un identifiant BOAMP, genere une description du projet puis recherche les marches DECP les plus similaires pour estimer un montant moyen.

#### Parametres (body JSON)

| Parametre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `boampId` | string | Oui | Identifiant BOAMP du document (ex : `"24-12345"`) |
| `codeCpv` | string | Non | Code CPV pour affiner la recherche de marches similaires |

#### Exemple de requete

```bash
curl -X POST https://nscercspotj2rciose-container-extraction-donnee.functions.fnc.fr-par.scw.cloud/boamp-estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <VOTRE_TOKEN>" \
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
  "boampDescription": "Construction d'un groupe scolaire de 12 classes comprenant des salles de classe, un refectoire et des espaces administratifs sur la commune de Cayenne.",
  "averageMontant": 1850000,
  "similarDecp": [
    {
      "decpId": "decp-001",
      "description": "Marche de travaux portant sur la construction d'un etablissement scolaire...",
      "montant": 2000000,
      "distance": 0.05
    },
    {
      "decpId": "decp-002",
      "description": "Realisation d'un equipement scolaire comprenant 10 classes...",
      "montant": 1700000,
      "distance": 0.08
    }
  ]
}
```

#### Description des champs de reponse

| Champ | Type | Description |
|-------|------|-------------|
| `success` | boolean | Succes du traitement |
| `boampId` | string | Identifiant BOAMP du document traite |
| `boampDescription` | string | Description du projet generee par l'IA |
| `averageMontant` | number ou absent | Montant moyen estime en euros (calcule sur les marches similaires ayant un montant renseigne). Absent si aucun marche similaire trouve |
| `similarDecp` | array | Liste des marches similaires trouves (10 maximum) |
| `similarDecp[].decpId` | string | Identifiant du marche DECP |
| `similarDecp[].description` | string | Description du marche DECP |
| `similarDecp[].montant` | number ou null | Montant du marche en euros |
| `similarDecp[].distance` | number | Score de similarite (0 = identique, plus la valeur est basse plus le marche est similaire) |

---

## Gestion des erreurs

Toutes les erreurs suivent un format standardise.

### Codes HTTP

| Code | Signification |
|------|---------------|
| 200 | Succes |
| 400 | Parametres de requete invalides |
| 401 | Token d'authentification manquant ou invalide |
| 404 | Route inexistante |
| 500 | Erreur interne du serveur |
| 502 | Echec de recuperation des donnees en amont |

### Exemples de reponses d'erreur

**Token manquant ou invalide (401) :**
```json
{
  "message": "Unauthorized"
}
```

**Parametres invalides (400) :**
```json
{
  "error": "Invalid request parameters",
  "details": {
    "dateDebut": ["Format attendu: YYYY-MM-DD"],
    "codeDepartement": ["Code departement invalide (2 ou 3 chiffres)"]
  }
}
```

**Echec en amont (502) :**
```json
{
  "error": "Failed to process documents",
  "details": "Connection timeout"
}
```

**Erreur serveur (500) :**
```json
{
  "error": "Internal server error",
  "details": "Error message"
}
```

---

## Notes

- **Temps de reponse** : les documents sont traites sequentiellement. Le temps de reponse est proportionnel au nombre de documents demandes.
- **Pagination** : pour les requetes avec beaucoup de resultats, utilisez `rows` et `offset` pour paginer.
- **Retry automatique** : en cas d'echec temporaire lors de la recuperation des donnees, l'API retente automatiquement jusqu'a 3 fois avec un delai croissant.