# Vulnérabilités

## Backend (server.js)

### 1. Secrets exposés en dur dans le code
**Sévérité:** Critique
```javascript
const JWT_SECRET = process.env.JWT_SECRET || "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i2b";
const STRIPE_SECRET_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p";
const ADMIN_API_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i3m";
```

**Risque:** Les clés API Stripe et autres secrets sont visibles dans le code source. Un attaquant ayant accès au repo peut voler ces clés et effectuer des transactions frauduleuses.

---

### 2. Configuration session non sécurisée
**Sévérité:** Haute
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

**Risques:**
- `secure: false` : cookies transmis en HTTP non chiffré
- `httpOnly: false` : cookies accessibles via JavaScript (XSS)
- Pas de `sameSite` : vulnérable au CSRF
- Pas de `domain`, `path`, `expires` : mauvaise gestion des cookies

---

### 3. Injection de code via eval()
**Sévérité:** Critique
```javascript
const searchCode = `db.products.filter(p => p.name.toLowerCase().includes('${query}'.toLowerCase()))`;
const results = eval(searchCode);
```

**Risque:** Un attaquant peut injecter du code arbitraire via le paramètre `query`. Exemple: `'); process.exit(); ('` arrêterait le serveur.

---

### 4. Injection SQL simulée
**Sévérité:** Critique
```javascript
const query = `username = '${username}' AND password = '${password}'`;

const user = db.users.find(u => {
    if (username.includes("' OR '1'='1")) {
        return true;
    }
    return u.username === username && u.password === password;
});
```

**Risque:** Bypass d'authentification avec `' OR '1'='1` comme nom d'utilisateur.

---

### 5. Path Traversal
**Sévérité:** Haute
```javascript
app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const content = fs.readFileSync(`./uploads/${filename}`, 'utf8');
    res.send(content);
});
```

**Risque:** Un attaquant peut lire n'importe quel fichier du serveur avec `../../../etc/passwd`.

---

### 6. Route debug exposant des secrets
**Sévérité:** Critique
```javascript
app.get('/api/debug', (req, res) => {
    res.json({
        env: process.env,
        secrets: {
            JWT_SECRET: JWT_SECRET,
            STRIPE_SECRET_KEY: STRIPE_SECRET_KEY
        },
        database: db
    });
});
```

**Risque:** Exposition complète des secrets et de la base de données sans authentification.

---

### 7. Routes sans authentification
**Sévérité:** Moyenne
```javascript
app.get('/api/users', (req, res) => {
    res.json(db.users);
});
```

**Risque:** Accès à la liste de tous les utilisateurs sans authentification.

---

### 8. XSS via res.send()
**Sévérité:** Haute
```javascript
res.send(content);
```

**Risque:** Le contenu du fichier est envoyé sans échappement, permettant l'injection de scripts malveillants.

---

## Frontend (App.js)

### 9. Clé API exposée en dur
**Sévérité:** Critique
```javascript
const API_KEY = 'sk_live_41Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p';
```

**Risque:** Clé API visible dans le code source côté client.

---

### 10. Injection de code via eval()
**Sévérité:** Critique
```javascript
const filtered = products.filter(p => {
    return eval(`p.name.toLowerCase().includes('${searchQuery}'.toLowerCase())`);
});
```

**Risque:** Exécution de code arbitraire côté client.

---

### 11. XSS via dangerouslySetInnerHTML
**Sévérité:** Haute
```javascript
<h3 dangerouslySetInnerHTML={{ __html: product.name }}></h3>
<h2 dangerouslySetInnerHTML={{ __html: selectedProduct.name }}></h2>
<div dangerouslySetInnerHTML={{ __html: review.comment }} />
```

**Risque:** Si le nom du produit ou le commentaire contient du HTML/JS malveillant, il sera exécuté.

---

### 12. Exposition de secrets dans console.log
**Sévérité:** Moyenne
```javascript
useEffect(() => {
    console.log('User data:', user);
    console.log('API Key:', API_KEY);
    console.log('JWT Token:', localStorage.getItem('token'));
}, [user]);
```

**Risque:** Secrets visibles dans la console du navigateur.

---

## Dockerfile

### 13. Secret dans le Dockerfile
**Sévérité:** Moyenne
```dockerfile
ENV REACT_APP_API_KEY=frontend-api-key-123456
```

**Risque:** Le secret est visible dans l'historique des layers Docker.

---

## Dépendances

### 14. Vulnérabilités dans react-scripts
**Sévérité:** Haute

- nth-check < 2.0.1 : ReDoS
- postcss < 8.4.31 : Parsing error
- webpack-dev-server <= 5.2.0 : Vol de code source

**Risque:** Vulnérabilités connues exploitables.

---

## Images Docker (Trivy Scan)

### 15. Image Backend obsolète (node:16 / Debian 10)
**Sévérité:** Critique

| Package | CVE | Description |
|---------|-----|-------------|
| git, git-man | CVE-2024-32002 | Recursive clones RCE |
| libdb5.3, libdb5.3-dev | CVE-2019-8457 | SQLite heap out-of-bound read |
| libpython2.7-*, libpython3.7-* | CVE-2022-48565 | XML External Entity (XXE) |
| python2.7-*, python3.7-* | CVE-2022-48565 | XML External Entity (XXE) |
| linux-libc-dev | CVE-2023-25775 | irdma improper access control |
| wget | CVE-2024-38428 | Input misinterpretation |
| zlib1g, zlib1g-dev | CVE-2023-45853 | Integer overflow / heap buffer overflow |

**Risque:** L'image de base Debian 10 (Buster) n'est plus supportée et contient de nombreuses vulnérabilités non corrigées.

---

### 16. Image MongoDB obsolète (mongo:5.0)
**Sévérité:** Critique

| CVE | Description |
|-----|-------------|
| CVE-2023-24538 | golang: html/template: backticks not treated as string delimiters |
| CVE-2023-24540 | golang: html/template: improper handling of JavaScript whitespace |
| CVE-2024-24790 | golang: net/netip: Unexpected behavior from Is methods for IPv4-mapped IPv6 addresses |

**Risque:** L'utilitaire `gosu` dans l'image MongoDB utilise une version obsolète de Go (v1.18.2) avec des vulnérabilités critiques.

---

### 17. Image Frontend obsolète (node:16)
**Sévérité:** Haute
**Type:** Image de base obsolète

**Risque:** Même problème que le backend - Debian 10 n'est plus supporté.

---

## Configuration Docker

### 18. Secrets en dur dans le Dockerfile backend
**Sévérité:** Critique
```dockerfile
ENV NODE_ENV=production
ENV JWT_SECRET=my-super-secret-jwt-key-12345
ENV SESSION_SECRET=my-session-secret-key
```

**Risque:** Les secrets sont visibles dans l'historique des layers Docker et dans le code source.

---

### 19. Ordre des instructions Dockerfile inefficace
**Sévérité:** Basse
**Type:** Mauvaise pratique
```dockerfile
COPY . .
RUN npm install
```

**Risque:** Le cache Docker est invalidé à chaque modification de fichier, ralentissant les builds.

---

### 20. Installation des dépendances de développement en production
**Sévérité:** Moyenne
```dockerfile
RUN npm install
```

**Risque:** Les dépendances de développement augmentent la surface d'attaque et la taille de l'image.
