# TODO - Correction ESLint

- [ ] Lire l’état actuel des erreurs ESLint (app.controller.ts, auth.controller.ts, auth.service.ts, jwt.strategy.ts, warning main.ts)
- [ ] Corriger les erreurs `prettier/prettier` (parsing strict mode) dans `src/app.controller.ts` et `src/modules/auth/controllers/auth/auth.controller.ts`
- [ ] Corriger les erreurs `prettier/prettier` et `@typescript-eslint/no-unsafe-*` dans `src/modules/auth/services/auth/auth.service.ts` (remplacer `any` par DTOs, typer `payload`, typer retours)
- [ ] Corriger `@typescript-eslint/no-unsafe-return` dans `src/modules/auth/strategies/jwt.strategy.ts`
- [ ] Gérer le warning `@typescript-eslint/no-floating-promises` dans `src/main.ts` (await/catch ou void)
- [ ] Relancer `npm run lint -- --max-warnings=0` pour valider

