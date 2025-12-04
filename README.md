# Vuln-E-Commerce - Projet DevSecOps

> **Statut : SECURISE** - Audit et corrections complétés

**ATTENTION :** La branche `main` contient le code vulnérable d'origine. Pour voir le code corrigé, basculez sur la branche `secure`.

## Résumé de l'audit

| Catégorie | Vulnérabilités | Statut |
|-----------|----------------|--------|
| Backend (server.js) | 8 | Corrigé |
| Frontend (App.js) | 4 | Corrigé |
| Dockerfile | 1 | Corrigé |
| Dépendances | 1 | Corrigé |
| Images Docker (Trivy) | 3 | Corrigé |
| Configuration Docker | 5 | Corrigé |
| **Total** | **22** | **Corrigé** |

### Corrections majeures

- Migration Create React App vers Vite
- Images Docker mises à jour (node:20-alpine, mongo:7.0)
- 19 CVE CRITICAL éliminées
- Secrets externalisés via variables d'environnement
- Containers non-root avec healthchecks

**Documentation complète :** [Vulnérabilités](./VULNERABILITES.md) | [Corrections](./CORRECTIONS.md)
