# Rapport final Devsecops
Lien github : https://github.com/stea-tt/Groupe-1_Vuln-E-Commerce

### Groupe : 1
### &nbsp;&nbsp;&nbsp;Simon Boisneault
### &nbsp;&nbsp;&nbsp;Sven Bernard
### &nbsp;&nbsp;&nbsp;Vincent Durou
### &nbsp;&nbsp;&nbsp;Antoine Perard

# Frontend
## Vulnérabilité trouvés

### 1. Injestion SQL
// dans frontend/src/app.js
```js
const [selectedProduct, setSelectedProduct] = useState(null);
const [reviews, setReviews] = useState([]);
```

## Corrections
// dans frontend/src/app.js
```js
const [selectedProduct, setSelectedProduct] = useState(null);
const [reviews, setReviews] = useState([]);
```


# Backend
## 1. XXXXXXXXXX
### emplacement : XXXXXXXX/XXXXXX
## Vulnérabilité trouvés
## Corrections


# Dockerfile
## 1. Image de base node vulnérable
### emplacement : // backend/Dockerfile
## Vulnérabilité trouvés
```yml
FROM node:16
```
## Corrections
```yml
FROM node:20-alpine
```