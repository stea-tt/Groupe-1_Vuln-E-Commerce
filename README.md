# 🛒 E-Commerce - Projet DevSecOps

## 📋 Description

Application e-commerce fullstack (Node.js + React) conçue pour l'apprentissage du DevSecOps.

### Stack Technique

**Backend** :
- Node.js 16+ / Express 4.x
- Base de données in-memory (simulation)
- Session management
- JWT authentication

**Frontend** :
- React 17+
- React Router
- CSS moderne

**DevOps** :
- Docker & Docker Compose
- GitHub Actions (CI/CD)
- Outils de sécurité (Semgrep, Trivy, Gitleaks)

---

## 🎯 Objectifs Pédagogiques

Ce projet permet d'apprendre à :

1. ✅ **Identifier** les vulnérabilités de sécurité dans une application réelle
2. ✅ **Analyser** le code avec des outils SAST/SCA
3. ✅ **Corriger** les failles de sécurité avec les bonnes pratiques
4. ✅ **Conteneuriser** une application de manière sécurisée
5. ✅ **Mettre en place** un pipeline DevSecOps complet

---

## 🚀 Installation et Démarrage

### Prérequis

- Node.js 18+
- npm 9+
- Docker & Docker Compose (optionnel)
- Git

### Installation Locale

#### Backend

```bash
# Naviguer dans le dossier backend
cd backend

# Installer les dépendances
npm install

# Lancer le serveur
npm start
```

Le backend sera accessible sur `http://localhost:5001`

#### Frontend

```bash
# Naviguer dans le dossier frontend
cd frontend

# Installer les dépendances
npm install

# Lancer l'application
npm start
```

Le frontend sera accessible sur `http://localhost:3000`

### Avec Docker Compose

```bash
# À la racine du projet
docker compose up --build
```

Services disponibles :
- Frontend : `http://localhost:3000`
- Backend : `http://localhost:5001`

---

## Structure du Projet

```
vuln-ecommerce/
├── backend/
│   ├── server.js              # Serveur Express
│   ├── package.json           # Dépendances backend
│   └── Dockerfile             # Image Docker backend
├── frontend/
│   ├── src/
│   │   ├── App.js            # Composant principal React
│   │   ├── App.css           # Styles
│   │   ├── index.js          # Point d'entrée
│   │   └── index.css         # Styles globaux
│   ├── public/
│   │   └── index.html        # HTML de base
│   ├── package.json          # Dépendances React
│   └── Dockerfile            # Image Docker frontend
├── .github/
│   └── workflows/
│       └── security.yml      # Pipeline CI/CD DevSecOps
├── docker-compose.yml        # Configuration Docker Compose
├── .env.example              # Variables d'environnement (exemple)
└── README.md
```

---

## Travail Demandé (Projet Étudiant)

### Phase 1 : Analyse

1. **Identifier les vulnérabilités**
   - Utiliser les outils SAST/SCA fournis dans le pipeline
   - Analyser le code manuellement
   - Documenter chaque vulnérabilité trouvée
   - Créer un fichier `VULNERABILITIES.md`

2. **Analyser le pipeline DevSecOps**
   - Comprendre le fichier `.github/workflows/security.yml`
   - Exécuter le pipeline localement si possible
   - Interpréter les résultats des scans

### Phase 2 : Corrections

3. **Corriger les vulnérabilités**
   - Documenter les corrections dans `CORRECTIONS.md`
   - Mettez les fichiers `server.js`, `App.js` `Dockerfile` `docker-compose.yml` avec les corrections dans la branch **secure** de votre repo

4. **Documentation et présentation**
   - README
   - Rapport PDF
   - Slides de présentation
   - Démo du pipeline

---

## 🛠️ Outils Recommandés

### Analyse Statique (SAST)
- **Semgrep** : Analyse de code avec règles personnalisables
- **CodeQL** : Analyse profonde de GitHub
- **ESLint** : Avec plugins de sécurité

### Analyse des Dépendances (SCA)
- **npm audit** : Intégré à npm
- **Snyk** : Détection de vulnérabilités
- **Trivy** : Scanner complet

### Détection de Secrets
- **Gitleaks** : Détection dans Git
- **TruffleHog** : Recherche dans l'historique

### Scan de Conteneurs
- **Trivy** : Scanner Docker complet
- **Grype** : Alternative à Trivy

---

## 📊 Tests Rapides

### Test de l'Application

```bash
# Démarrer l'application
docker compose up --build

# Dans un autre terminal, tester l'API
curl http://localhost:5001/health

# Accéder au frontend
open http://localhost:3000
```

### Scan Automatique

```bash
# Scan des dépendances
cd backend && npm audit
cd frontend && npm audit

# Scan avec Semgrep
npx semgrep --config=auto .

# Scan Docker avec Trivy (si installé)
docker build -t vuln-ecommerce-backend backend/
trivy image vuln-ecommerce-backend

# Détection de secrets (si Docker disponible)
docker run -v $(pwd):/path ghcr.io/gitleaks/gitleaks:latest detect --source="/path" -v
```

---

## 📚 Ressources Complémentaires

### Documentation
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [React Security](https://reactjs.org/docs/dom-elements.html)
- [Docker Security](https://docs.docker.com/engine/security/)

### Formation
- [OWASP Juice Shop](https://owasp.org/www-project-juice-shop/) - Application vulnérable similaire
- [PortSwigger Academy](https://portswigger.net/web-security) - Formation web security
- [HackTheBox](https://www.hackthebox.com/) - Entraînement pratique

### Outils
- [Semgrep Registry](https://semgrep.dev/explore) - Règles de sécurité
- [Snyk Vulnerability DB](https://snyk.io/vuln/) - Base de données CVE
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/) - Guides de sécurité

---

## ✅ Checklist de Validation

Avant de soumettre votre projet, vérifiez :

### Code
- [ ] Vulnérabilités identifiées et documentées
- [ ] Corrections appliquées et testées
- [ ] Secrets externalisés dans `.env`
- [ ] `.env` dans `.gitignore`
- [ ] Dépendances à jour (`npm audit` propre)

### Docker
- [ ] `Dockerfile.secure` créés (backend + frontend)
- [ ] Images Alpine utilisées
- [ ] Utilisateur non-root
- [ ] Healthcheck configuré
- [ ] Scan Trivy sans vulnérabilités CRITICAL

### Pipeline
- [ ] `.github/workflows/security.yml` compris et analysé
- [ ] Résultats des scans interprétés
- [ ] Corrections validées par les outils

### Documentation
- [ ] `VULNERABILITIES.md` complet
- [ ] `CORRECTIONS.md` avec avant/après
- [ ] README mis à jour
- [ ] Rapport PDF
- [ ] Slides de présentation

---

## 🆘 Support

### En cas de problème

1. **Consultez d'abord** :
   - Documentation des outils utilisés
   - Issues GitHub du projet
   - Ressources OWASP

2. **Questions** :
   - Contacter l'enseignant

3. **Bugs** :
   - Vérifier la version de Node.js (18+)
   - Vérifier que les ports 3000 et 5001 sont libres
   - Supprimer `node_modules` et réinstaller

---


**Bon courage !**
