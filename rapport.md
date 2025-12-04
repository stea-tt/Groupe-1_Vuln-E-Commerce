# Rapport final Devsecops
Lien github : https://github.com/stea-tt/Groupe-1_Vuln-E-Commerce

### Groupe : 1
### &nbsp;&nbsp;&nbsp;Simon Boisneault
### &nbsp;&nbsp;&nbsp;Sven Bernard
### &nbsp;&nbsp;&nbsp;Vincent Durou
### &nbsp;&nbsp;&nbsp;Antoine Perard
### &nbsp;&nbsp;&nbsp;Niels Lebon

# Rapport d'Audit de Sécurité - Projet E-Commerce DevSecOps

## Informations Générales

| Element | Valeur |
|---------|--------|
| Projet | Vuln-E-Commerce |
| Branche auditee | main |
| Branche corrigee | secure |
| Nombre de vulnerabilites | 22 |
| Statut | Corrige |

---

## Synthese 

L'audit de securite du projet e-commerce a revele 22 vulnerabilites de severites variables, dont 8 critiques, 8 hautes, 5 moyennes et 1 basse. Les failles identifiees couvrent l'ensemble de la stack technique : code applicatif (backend et frontend), configuration Docker, images de base et dependances npm.

L'ensemble des vulnerabilites a ete corrige sur la branche `secure`. Les corrections incluent notamment la migration du bundle React vers Vite, la mise a jour des images Docker obsoletes, l'implementation d'un modele de securite base sur les variables d'environnement et l'ajout de controles d'acces sur les routes sensibles. Il y a aussi des modifications du code afin de fix différentes vulnérabilités.

---

## Vulnerabilites Identifiees

### Backend (server.js)

#### 1. Secrets exposes en dur dans le code
**Severite:** Critique

**Description:** Les cles API Stripe, JWT et autres secrets sont codes en dur dans le fichier source.

**Code vulnerable:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i2b";
const STRIPE_SECRET_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p";
const ADMIN_API_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i3m";
```

**Risque:** Un attaquant ayant acces au repository peut extraire ces cles et effectuer des transactions frauduleuses ou compromettre l'ensemble du systeme.

**Correction:** Externalisation des secrets via variables d'environnement avec validation au demarrage.

---

#### 2. Configuration session non securisee
**Severite:** Haute

**Description:** La configuration de session express presente plusieurs failles de securite.

**Code vulnerable:**
```javascript
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));
```

**Risques identifies:**
- `secure: false` : cookies transmis en clair sur HTTP
- `httpOnly: false` : cookies accessibles via JavaScript (XSS)
- Absence de `sameSite` : vulnerabilite CSRF
- Absence de `domain`, `path`, `expires` : gestion inadequate des cookies

**Correction:** Configuration securisee avec `secure: true`, `httpOnly: true`, `sameSite: 'strict'`.

---

#### 3. Injection de code via eval()
**Severite:** Critique

**Description:** Utilisation de la fonction `eval()` avec des donnees utilisateur non sanitisees.

**Code vulnerable:**
```javascript
const searchCode = `db.products.filter(p => p.name.toLowerCase().includes('${query}'.toLowerCase()))`;
const results = eval(searchCode);
```

**Risque:** Execution de code arbitraire sur le serveur. Un attaquant peut injecter `'); process.exit(); ('` pour arreter le serveur ou executer des commandes systeme.

**Correction:** Suppression de `eval()` et utilisation de methodes de filtrage natives.

---

#### 4. Injection SQL simulee
**Severite:** Critique

**Description:** Implementation d'une faille d'injection SQL intentionnelle permettant le contournement de l'authentification.

**Code vulnerable:**
```javascript
const user = db.users.find(u => {
    if (username.includes("' OR '1'='1")) {
        return true;
    }
    return u.username === username && u.password === password;
});
```

**Risque:** Contournement complet de l'authentification avec le payload `' OR '1'='1`.

**Correction:** Comparaison directe des identifiants sans concatenation de chaines.

---

#### 5. Path Traversal
**Severite:** Haute

**Description:** Absence de validation du parametre filename permettant la lecture de fichiers arbitraires.

**Code vulnerable:**
```javascript
app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const content = fs.readFileSync(`./uploads/${filename}`, 'utf8');
    res.send(content);
});
```

**Risque:** Lecture de fichiers sensibles du serveur via `../../../etc/passwd`.

**Correction:** Validation du chemin avec `path.basename()` et verification de l'absence de sequences `..`.

---

#### 6. Route debug exposant des secrets
**Severite:** Critique

**Description:** Endpoint de debug accessible sans authentification exposant les secrets et la base de donnees.

**Code vulnerable:**
```javascript
app.get('/api/debug', (req, res) => {
    res.json({
        env: process.env,
        secrets: { JWT_SECRET, STRIPE_SECRET_KEY },
        database: db
    });
});
```

**Risque:** Exposition complete des secrets applicatifs et des donnees utilisateurs.

**Correction:** Restriction de la route au mode developpement avec authentification administrateur.

---

#### 7. Routes sans authentification
**Severite:** Moyenne

**Description:** Endpoints sensibles accessibles sans controle d'acces.

**Code vulnerable:**
```javascript
app.get('/api/users', (req, res) => {
    res.json(db.users);
});
```

**Risque:** Acces non autorise aux donnees utilisateurs.

**Correction:** Implementation de middlewares `requireAuth` et `requireAdmin`.

---

#### 8. XSS via res.send()
**Severite:** Haute

**Description:** Envoi de contenu de fichier sans echappement ni definition du type MIME.

**Code vulnerable:**
```javascript
res.send(content);
```

**Risque:** Injection de scripts malveillants si le fichier contient du HTML/JavaScript.

**Correction:** Definition explicite du type MIME avec `res.type('text/plain')`.

---

### Frontend (App.js)

#### 9. Cle API exposee en dur
**Severite:** Critique

**Description:** Cle API codee en dur dans le code source frontend.

**Code vulnerable:**
```javascript
const API_KEY = 'sk_live_41Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p';
```

**Risque:** Cle visible dans le code source compile et les outils de developpement du navigateur.

**Correction:** Utilisation de variables d'environnement Vite (`import.meta.env.VITE_API_KEY`).

---

#### 10. Injection de code via eval()
**Severite:** Critique

**Description:** Utilisation de `eval()` cote client avec des donnees utilisateur.

**Code vulnerable:**
```javascript
const filtered = products.filter(p => {
    return eval(`p.name.toLowerCase().includes('${searchQuery}'.toLowerCase())`);
});
```

**Risque:** Execution de code arbitraire dans le navigateur de l'utilisateur.

**Correction:** Utilisation de methodes de filtrage natives JavaScript.

---

#### 11. XSS via dangerouslySetInnerHTML
**Severite:** Haute

**Description:** Rendu de contenu HTML non sanitise via `dangerouslySetInnerHTML`.

**Code vulnerable:**
```javascript
<h3 dangerouslySetInnerHTML={{ __html: product.name }}></h3>
<div dangerouslySetInnerHTML={{ __html: review.comment }} />
```

**Risque:** Execution de scripts malveillants si les donnees contiennent du HTML/JavaScript.

**Correction:** Utilisation du rendu texte standard de React (`{product.name}`).

---

#### 12. Exposition de secrets dans console.log
**Severite:** Moyenne

**Description:** Journalisation de donnees sensibles dans la console du navigateur.

**Code vulnerable:**
```javascript
useEffect(() => {
    console.log('API Key:', API_KEY);
    console.log('JWT Token:', localStorage.getItem('token'));
}, [user]);
```

**Risque:** Secrets visibles dans les outils de developpement du navigateur.

**Correction:** Suppression des logs contenant des donnees sensibles.

---

### Dockerfile

#### 13. Secret dans le Dockerfile
**Severite:** Moyenne

**Description:** Variable d'environnement contenant un secret definie dans le Dockerfile.

**Code vulnerable:**
```dockerfile
ENV REACT_APP_API_KEY=frontend-api-key-123456
```

**Risque:** Secret visible dans l'historique des layers Docker.

**Correction:** Utilisation de build arguments passes au moment du build.

---

### Dependances

#### 14. Vulnerabilites dans react-scripts
**Severite:** Haute

**Description:** Le package react-scripts contient des dependances avec des vulnerabilites connues.

**Vulnerabilites identifiees:**
- nth-check < 2.0.1 : ReDoS (Regular Expression Denial of Service)
- postcss < 8.4.31 : Erreur de parsing
- webpack-dev-server <= 5.2.0 : Vol de code source

**Correction:** Migration de Create React App vers Vite, eliminant ces dependances vulnerables.

---

### Images Docker (Trivy Scan)

#### 15. Image Backend obsolete (node:16 / Debian 10)
**Severite:** Critique

**Description:** L'image de base node:16 utilise Debian 10 (Buster) qui n'est plus supporte.

**Correction:** Migration vers node:20-alpine.

---

#### 16. Image MongoDB obsolete (mongo:5.0)
**Severite:** Critique

**Description:** L'image mongo:5.0 contient l'utilitaire gosu avec des vulnerabilites Go.

**Correction:** Migration vers mongo:7.0.

---

#### 17. Image Frontend obsolete (node:16)
**Severite:** Haute

**Description:** Meme problematique que l'image backend - Debian 10 n'est plus supporte.

**Correction:** Migration vers node:20-alpine.

---

### Configuration Docker

#### 18. Secrets en dur dans le Dockerfile backend
**Severite:** Critique

**Description:** Secrets definis directement dans le Dockerfile.

**Code vulnerable:**
```dockerfile
ENV NODE_ENV=production
ENV JWT_SECRET=my-super-secret-jwt-key-12345
ENV SESSION_SECRET=my-session-secret-key
```

**Risque:** Secrets visibles dans l'historique des layers et le code source.

**Correction:** Passage des secrets via docker-compose.yml avec variables d'environnement.

---

#### 19. Ordre des instructions Dockerfile inefficace
**Severite:** Basse

**Description:** L'ordre des instructions invalide le cache Docker a chaque modification.

**Code vulnerable:**
```dockerfile
COPY . .
RUN npm install
```

**Impact:** Temps de build augmente, reinstallation des dependances a chaque modification de fichier.

**Correction:** Copie du package.json avant npm install, puis copie du reste des fichiers.

---

#### 20. Installation des dependances de developpement en production
**Severite:** Moyenne

**Description:** Les dependances de developpement sont installees dans l'image de production.

**Code vulnerable:**
```dockerfile
RUN npm install
```

**Risque:** Surface d'attaque augmentee et taille d'image plus importante.

**Correction:** Utilisation de `npm install --omit=dev`.

---

#### 21. Containers executes en tant que root
**Severite:** Haute

**Description:** Les containers s'executent avec les privileges root par defaut.

**Risque:** En cas d'exploitation d'une vulnerabilite applicative, l'attaquant obtient un acces root au container, facilitant l'evasion et la compromission de l'hote.

**Correction:** Creation d'un utilisateur non-root et utilisation de la directive `USER`.

---

#### 22. Absence de healthcheck Docker
**Severite:** Moyenne

**Description:** Aucun healthcheck configure pour verifier l'etat des containers.

**Risque:** Docker ne peut pas detecter si l'application est fonctionnelle. Un container peut etre en etat "running" avec une application plantee. Les orchestrateurs ne peuvent pas redemarrer automatiquement les containers defaillants.

**Correction:** Ajout de healthchecks dans les Dockerfiles et docker-compose.yml.

---

## Corrections Appliquees

### Recapitulatif des Actions

| # | Vulnerabilite | Severite | Action |
|---|---------------|----------|--------|
| 1 | Secrets en dur (backend) | Critique | Variables d'environnement + .env |
| 2 | Session non securisee | Haute | Configuration securisee des cookies |
| 3 | eval() backend | Critique | Suppression et filtrage natif |
| 4 | Injection SQL | Critique | Comparaison directe |
| 5 | Path Traversal | Haute | Validation avec path.basename() |
| 6 | Route debug exposee | Critique | Restriction + authentification admin |
| 7 | Routes sans auth | Moyenne | Middlewares requireAuth/requireAdmin |
| 8 | XSS res.send() | Haute | Type MIME explicite |
| 9 | Secrets en dur (frontend) | Critique | Variables d'environnement Vite |
| 10 | eval() frontend | Critique | Suppression et filtrage natif |
| 11 | XSS dangerouslySetInnerHTML | Haute | Rendu texte React |
| 12 | console.log secrets | Moyenne | Suppression des logs sensibles |
| 13 | Secret Dockerfile | Moyenne | Build arguments |
| 14 | Dependances vulnerables | Haute | Migration vers Vite |
| 15 | Image backend obsolete | Critique | node:20-alpine |
| 16 | Image MongoDB obsolete | Critique | mongo:7.0 |
| 17 | Image frontend obsolete | Haute | node:20-alpine |
| 18 | Secrets Dockerfile backend | Critique | Variables docker-compose |
| 19 | Ordre Dockerfile | Basse | Optimisation cache |
| 20 | Dependances dev en prod | Moyenne | npm install --omit=dev |
| 21 | Containers root | Haute | Utilisateur non-root |
| 22 | Absence healthcheck | Moyenne | Healthchecks configures |

---

## Recommandations Complementaires

### Court Terme

1. **Rotation des secrets** : Les secrets exposes dans l'historique Git doivent etre consideres comme compromis et regeneres.

2. **Audit des acces** : Verifier les acces au repository et revoquer les permissions non necessaires.

3. **Mise en place de pre-commit hooks** : Integrer des outils comme git-secrets ou truffleHog pour detecter les secrets avant commit.

### Moyen Terme

4. **Gestion centralisee des secrets** : Implementer une solution comme HashiCorp Vault, AWS Secrets Manager ou Azure Key Vault.

5. **Pipeline CI/CD securise** : Integrer les scans Trivy et npm audit dans le pipeline avec blocage en cas de vulnerabilites critiques.

6. **Monitoring de securite** : Mettre en place une surveillance des dependances avec Dependabot ou Snyk.

### Long Terme

7. **Hashage des mots de passe** : Implementer bcrypt ou Argon2 pour le stockage des mots de passe (actuellement en clair dans la base simulee).

8. **Rate limiting** : Ajouter une limitation du nombre de requetes pour prevenir les attaques par force brute.

9. **HTTPS obligatoire** : Configurer TLS/SSL pour l'ensemble des communications.

10. **Logs securises** : Implementer une solution de logging centralisee sans exposition de donnees sensibles.

---

## Conclusion

L'audit a permis d'identifier et de corriger 22 vulnerabilites couvrant l'ensemble de la stack technique. Les corrections appliquees sur la branche `secure` eliminent les risques critiques immediats lies aux secrets exposes, aux injections de code et aux images Docker obsoletes.

La migration vers Vite et les images Alpine a significativement reduit la surface d'attaque tout en ameliorant les performances de build. L'implementation d'utilisateurs non-root et de healthchecks renforce la posture de securite de l'infrastructure containerisee.

Les recommandations complementaires doivent etre prises en compte pour maintenir un niveau de securite adequat sur le long terme.
