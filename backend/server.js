require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

const JWT_SECRET = process.env.JWT_SECRET;
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

if (!JWT_SECRET || !SESSION_SECRET || !STRIPE_SECRET_KEY || !ADMIN_API_KEY) {
    console.error('ERREUR: Variables d\'environnement manquantes. Vérifiez votre fichier .env');
    process.exit(1);
}

app.use(cors({
    origin: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

const db = {};
db.users = [];
db.products = [];
db.orders = [];
db.reviews = [];

db.users.push({
    id: 1,
    username: 'admin',
    email: 'admin@ecommerce.com',
    role: 'admin'
});

db.users.push({
    id: 2,
    username: 'user',
    password: 'user123',
    email: 'user@example.com',
    role: 'customer',
});

db.products = [
    { id: 1, name: 'Laptop HP', price: 799, stock: 10, category: 'electronics' },
    { id: 2, name: 'iPhone 14', price: 999, stock: 15, category: 'electronics' },
    { id: 3, name: 'T-Shirt Nike', price: 29, stock: 50, category: 'clothing' },
    { id: 4, name: 'Chaussures Adidas', price: 89, stock: 30, category: 'clothing' }
];

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

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

app.post('/api/register', (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).json({ error: 'Champs requis manquants' });
    }

    const existingUser = db.users.find(u => u.username === username || u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'Utilisateur déjà existant' });
    }

    const newUser = {
        id: db.users.length + 1,
        username: username,
        password: password,
        email: email,
        role: 'customer'
    };

    db.users.push(newUser);

    res.json({
        success: true,
        message: 'Utilisateur créé',
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Identifiants requis' });
    }

    const user = db.users.find(u => u.username === username && u.password === password);

    if (user) {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        req.session.user = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        res.json({
            success: true,
            token: token,
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'Identifiants incorrects'
        });
    }
});

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

app.get('/api/users', requireAdmin, (req, res) => {
    const safeUsers = db.users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role
    }));
    res.json(safeUsers);
});

app.get('/api/users/:id', requireAuth, (req, res) => {
    const userId = parseInt(req.params.id, 10);

    if (req.session.user.id !== userId && req.session.user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès refusé' });
    }

    const user = db.users.find(u => u.id === userId);

    if (user) {
        const { password, ...safeUser } = user;
        res.json(safeUser);
    } else {
        res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
});

app.post('/api/products/:id/review', requireAuth, (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Note invalide (1-5)' });
    }

    const review = {
        id: Date.now(),
        productId: productId,
        userId: req.session.user.id,
        rating: parseInt(rating, 10),
        comment: comment ? String(comment).substring(0, 500) : '',
        date: new Date()
    };

    db.reviews.push(review);

    res.json({
        success: true,
        review: review
    });
});

app.get('/api/products/:id/reviews', (req, res) => {
    const productId = parseInt(req.params.id, 10);
    const productReviews = db.reviews.filter(r => r.productId === productId);
    res.json(productReviews);
});

app.get('/api/products', (req, res) => {
    res.json(db.products);
});

app.post('/api/checkout', requireAuth, (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.user.id;

    const product = db.products.find(p => p.id === parseInt(productId, 10));

    if (!product) {
        return res.status(404).json({ message: 'Produit non trouvé' });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
        return res.status(400).json({ message: 'Quantité invalide' });
    }

    if (product.stock >= qty) {
        product.stock -= qty;

        const order = {
            id: db.orders.length + 1,
            userId: userId,
            productId: product.id,
            quantity: qty,
            total: product.price * qty,
            date: new Date()
        };

        db.orders.push(order);

        res.json({
            success: true,
            order: order
        });
    } else {
        res.status(400).json({
            message: 'Stock insuffisant'
        });
    }
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    res.json({
        totalUsers: db.users.length,
        totalProducts: db.products.length,
        totalOrders: db.orders.length
    });
});

app.get('/api/files/:filename', requireAuth, (req, res) => {
    const filename = req.params.filename;
    const fs = require('fs');

    const safeName = path.basename(filename);

    if (safeName !== filename || filename.includes('..')) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    const uploadsDir = path.resolve('./uploads');
    const filePath = path.resolve(uploadsDir, safeName);

    if (!filePath.startsWith(uploadsDir + path.sep)) {
        return res.status(403).json({ message: 'Accès refusé' });
    }

    try {
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(content);
    } catch(e) {
        res.status(404).json({ message: 'Fichier non trouvé' });
    }
});

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

app.get('/', (req, res) => {
    res.json({
        endpoints: [
            'GET /api/products',
            'GET /api/products/search?q=query',
            'POST /api/register',
            'POST /api/login',
            'GET /api/users',
            'GET /api/users/:id',
            'POST /api/products/:id/review',
            'POST /api/checkout',
            'GET /api/admin/stats',
            'GET /api/files/:filename'
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
