# TODO — lilyspace Admin (painel leve por senha)

- [ ] Confirmar objetivo: painel leve com senha (todos privilégios para dona e administrador)
- [x] Implementar painel leve (substituir Decap CMS) em `src/pages/admin/index.astro`
- [x] Implementar API via Netlify Function `admin-products` para listar e salvar `src/data/products.json`
- [x] Criar README de configuração da Function em `netlify/functions/README_ADMIN_PANEL.md`
- [ ] (opcional) Criar/ajustar configuração no Netlify com `ADMIN_PANEL_PASSWORD` (e token secret se usar)
- [ ] Commit e push das mudanças
- [ ] Validar localmente/build e depois testar login em `/admin` no deploy

