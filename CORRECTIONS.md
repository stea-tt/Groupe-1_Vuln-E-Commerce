# Corrections Appliquées

## Backend (server.js)

### 1. Secrets exposés en dur → Variables d'environnement

**Avant:**
```javascript
const JWT_SECRET = process.env.JWT_SECRET || "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i2b";
const STRIPE_SECRET_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p";
const ADMIN_API_KEY = "sk_live_51Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i3m";
```

**Après:**
```javascript
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!JWT_SECRET || !SESSION_SECRET || !STRIPE_SECRET_KEY || !ADMIN_API_KEY) {
    console.error('ERREUR: Variables d\'environnement manquantes.');
    process.exit(1);
}
```

**Fichier .env créé:**
```
JWT_SECRET=secret  
SESSION_SECRET=secret
STRIPE_SECRET_KEY=secret
ADMIN_API_KEY=secret
```

---

### 2. Configuration session non sécurisée → Session sécurisée

**Avant:**
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

**Après:**
```javascript
app.use(session({
    name: 'ecommerce_session',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        domain: process.env.COOKIE_DOMAIN || 'localhost',
        path: '/',
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
}));
```

---

### 3. Injection de code via eval() → Filtrage

**Avant:**
```javascript
app.get('/api/products/search', (req, res) => {
    const query = req.query.q;
    const searchCode = `db.products.filter(p => p.name.toLowerCase().includes('${query}'.toLowerCase()))`;
    const results = eval(searchCode);
    res.json(results);
});
```

**Après:**
```javascript
app.get('/api/products/search', (req, res) => {
    const query = req.query.q;

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Paramètre de recherche invalide' });
    }

    const sanitizedQuery = query.toLowerCase().trim();
    const results = db.products.filter(p =>
        p.name.toLowerCase().includes(sanitizedQuery)
    );

    res.json(results);
});
```

---

### 4. Injection SQL simulée → Comparaison directe

**Avant:**
```javascript
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const query = `username = '${username}' AND password = '${password}'`;

    const user = db.users.find(u => {
        if (username.includes("' OR '1'='1")) {
            return true;
        }
        return u.username === username && u.password === password;
    });
});
```

**Après:**
```javascript
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Identifiants requis' });
    }

    const user = db.users.find(u => u.username === username && u.password === password);

    if (user) {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.json({ success: true, token: token });
    } else {
        res.status(401).json({ success: false, message: 'Identifiants incorrects' });
    }
});
```

---

### 5. Path Traversal → Validation du chemin

**Avant:**
```javascript
app.get('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const content = fs.readFileSync(`./uploads/${filename}`, 'utf8');
    res.send(content);
});
```

**Après:**
```javascript
app.get('/api/files/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const fs = require('fs');

    const safeName = path.basename(filename);

    if (safeName !== filename || filename.includes('..')) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    const uploadsDir = './uploads';
    const filePath = uploadsDir + '/' + safeName;

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(content);
    } catch(e) {
        res.status(404).json({ message: 'Fichier non trouvé' });
    }
});
```

---

### 6. Route debug exposant des secrets → Protection et limitation

**Avant:**
```javascript
app.get('/api/debug', (req, res) => {
    res.json({
        env: process.env,
        secrets: { JWT_SECRET, STRIPE_SECRET_KEY },
        database: db
    });
});
```

**Après:**
```javascript
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/debug', requireAdmin, (req, res) => {
        res.json({
            message: 'Debug mode',
            database: {
                usersCount: db.users.length,
                productsCount: db.products.length,
                ordersCount: db.orders.length
            }
        });
    });
}
```

---

### 7. Routes sans authentification → Middlewares de protection

**Ajout des middlewares:**
```javascript
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
};
```

**Application:**
```javascript
app.get('/api/users', requireAdmin, (req, res) => { ... });
app.get('/api/users/:id', requireAuth, (req, res) => { ... });
app.post('/api/checkout', requireAuth, (req, res) => { ... });
app.get('/api/admin/stats', requireAdmin, (req, res) => { ... });
```

---

### 8. Exposition des mots de passe → Filtrage des données sensibles

**Avant:**
```javascript
app.get('/api/users', (req, res) => {
    res.json(db.users);
});
```

**Après:**
```javascript
app.get('/api/users', requireAdmin, (req, res) => {
    const safeUsers = db.users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role
    }));
    res.json(safeUsers);
});
```

---

## Frontend (App.js)

### 9. Clé API exposée → Variable d'environnement

**Avant:**
```javascript
const API_KEY = 'sk_live_41Hqp9K2eZvKYlo2C8xO3n4y5z6a7b8c9d0e1f2g3h4i5p';
```

**Après (avec Vite):**
```javascript
const API_KEY = import.meta.env.VITE_API_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
```

---

### 10. Injection de code via eval() → Filtrage natif

**Avant:**
```javascript
const handleSearch = async () => {
    const filtered = products.filter(p => {
        return eval(`p.name.toLowerCase().includes('${searchQuery}'.toLowerCase())`);
    });
    setProducts(filtered);
};
```

**Après:**
```javascript
const handleSearch = async () => {
    try {
        const sanitizedQuery = searchQuery.toLowerCase().trim();
        const filtered = products.filter(p =>
            p.name.toLowerCase().includes(sanitizedQuery)
        );
        setProducts(filtered);
    } catch (error) {
        console.error('Erreur recherche:', error);
    }
};
```

---

### 11. XSS via dangerouslySetInnerHTML → Rendu texte sécurisé

**Avant:**
```javascript
<h3 dangerouslySetInnerHTML={{ __html: product.name }}></h3>
<h2 dangerouslySetInnerHTML={{ __html: selectedProduct.name }}></h2>
<div dangerouslySetInnerHTML={{ __html: review.comment }} />
```

**Après:**
```javascript
<h3>{product.name}</h3>
<h2>{selectedProduct.name}</h2>
<div className="review-comment">{review.comment}</div>
```

---

### 12. Exposition de secrets dans console.log → Suppression

**Avant:**
```javascript
useEffect(() => {
    console.log('User data:', user);
    console.log('API Key:', API_KEY);
    console.log('JWT Token:', localStorage.getItem('token'));
}, [user]);
```

**Après:**
```javascript
// Supprimé - aucun log de données sensibles
```

---

## Dockerfile

### 13. Secret dans le Dockerfile → Build argument

**Avant:**
```dockerfile
ENV REACT_APP_API_KEY=frontend-api-key-123456
RUN npm run build
```

**Après:**
```dockerfile
ARG VITE_API_KEY
ARG VITE_API_URL
ENV VITE_API_KEY=$VITE_API_KEY
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
```

**Usage dans GitHub Actions:**
```yaml
- name: Build frontend
  run: |
    docker build \
      --build-arg VITE_API_KEY=${{ secrets.VITE_API_KEY }} \
      --build-arg VITE_API_URL=${{ secrets.VITE_API_URL }} \
      -t ecommerce-frontend ./frontend
```

---

## Dépendances

### 14. Vulnérabilités react-scripts → Migration vers Vite

**Avant (package.json):**
```json
{
  "dependencies": {
    "react": "17.0.2",
    "react-dom": "17.0.2",
    "react-scripts": "5.0.1"
  }
}
```

**Après (package.json):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.4.19"
  }
}
```

**Résultat npm audit:** 0 vulnérabilités

---

## Images Docker (Trivy Scan)

### 15. Image Backend obsolète → node:20-alpine

**Avant:**
```dockerfile
FROM node:16
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 5001
ENV NODE_ENV=production
ENV JWT_SECRET=my-super-secret-jwt-key-12345
ENV SESSION_SECRET=my-session-secret-key
CMD ["node", "server.js"]
```

**Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5001
CMD ["node", "server.js"]
```

**Résultat:** 16 CVE CRITICAL → 0 CVE CRITICAL

---

### 16. Image MongoDB obsolète → mongo:7.0

**Avant (docker-compose.yml):**
```yaml
services:
  mongodb:
    image: mongo:5.0
```

**Après (docker-compose.yml):**
```yaml
services:
  mongodb:
    image: mongo:7.0
```

**Résultat:** 3 CVE CRITICAL (gosu) → 0 CVE CRITICAL

---

### 17. Image Frontend obsolète → node:20-alpine

**Avant:**
```dockerfile
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG REACT_APP_API_KEY
ENV REACT_APP_API_KEY=$REACT_APP_API_KEY
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

**Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

---

### 18. Secrets en dur dans Dockerfile backend → Supprimés

**Avant:**
```dockerfile
ENV NODE_ENV=production
ENV JWT_SECRET=my-super-secret-jwt-key-12345
ENV SESSION_SECRET=my-session-secret-key
```

**Après:**
```dockerfile
# Secrets passés via docker-compose.yml
```

**docker-compose.yml:**
```yaml
backend:
  build: ./backend
  environment:
    - NODE_ENV=production
    - JWT_SECRET=${JWT_SECRET}
    - SESSION_SECRET=${SESSION_SECRET}
    - MONGODB_URI=mongodb://mongodb:27017/ecommerce
```

---

### 19. Ordre des instructions Dockerfile → Optimisé pour le cache

**Avant:**
```dockerfile
COPY . .
RUN npm install
```

**Après:**
```dockerfile
COPY package*.json ./
RUN npm install
COPY . .
```

---

### 20. Dépendances de développement en production → Exclues

**Avant:**
```dockerfile
RUN npm install
```

**Après:**
```dockerfile
RUN npm install --omit=dev
```

---

### 21. Containers exécutés en tant que root → Utilisateur non-root

**Backend - Avant:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 5001
CMD ["node", "server.js"]
```

**Backend - Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5001
CMD ["node", "server.js"]
```

**Frontend - Avant:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

**Frontend - Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

---

### 22. Absence de healthcheck Docker → Healthchecks configurés

**Backend - Avant:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5001
CMD ["node", "server.js"]
```

**Backend - Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5001/api/health || exit 1

CMD ["node", "server.js"]
```

**Frontend - Avant:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
```

**Frontend - Après:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs
RUN chown -R nodeuser:nodejs /app
USER nodeuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000 || exit 1

CMD ["serve", "-s", "build", "-l", "3000"]
```

**docker-compose.yml - Avant:**
```yaml
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
```

**docker-compose.yml - Après:**
```yaml
services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
```

**Route health ajoutée dans server.js:**
```javascript
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---


## Résumé des corrections

| # | Vulnérabilité | Sévérité | Statut |
|---|---------------|----------|--------|
| 1 | Secrets en dur (backend) | Critique | Corrigé |
| 2 | Session non sécurisée | Haute | Corrigé |
| 3 | eval() backend | Critique | Corrigé |
| 4 | Injection SQL | Critique | Corrigé |
| 5 | Path Traversal | Haute | Corrigé |
| 6 | Route debug exposée | Critique | Corrigé |
| 7 | Routes sans auth | Moyenne | Corrigé |
| 8 | Exposition mots de passe | Haute | Corrigé |
| 9 | Secrets en dur (frontend) | Critique | Corrigé |
| 10 | eval() frontend | Critique | Corrigé |
| 11 | XSS dangerouslySetInnerHTML | Haute | Corrigé |
| 12 | console.log secrets | Moyenne | Corrigé |
| 13 | Secret Dockerfile | Moyenne | Corrigé |
| 14 | Dépendances vulnérables | Haute | Corrigé (Vite) |
| 15 | Image backend obsolète | Critique | Corrigé (node:20-alpine) |
| 16 | Image MongoDB obsolète | Critique | Corrigé (mongo:7.0) |
| 17 | Image frontend obsolète | Haute | Corrigé (node:20-alpine) |
| 18 | Secrets Dockerfile backend | Critique | Corrigé |
| 19 | Ordre Dockerfile inefficace | Basse | Corrigé |
| 20 | Dépendances dev en prod | Moyenne | Corrigé |
| 21 | Containers en root | Haute | Corrigé (utilisateur non-root) |
| 22 | Absence de healthcheck | Moyenne | Corrigé |
