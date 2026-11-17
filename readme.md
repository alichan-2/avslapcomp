# Slap-Comp Studio

A public rebuild of the slap-comp prototype Alison Volkmar built in Kiro for Amazon Luxury & Premium Beauty.

## Files
- `index.html`: the whole tool
- `netlify/functions/refine.mjs`: the render server. It keeps the fal.ai key hidden.

## Deploy (Netlify, free plan)
Drag-and-drop deploys don't run server functions, so deploy from GitHub:
1. Create a GitHub repo and upload this whole folder, keeping the `netlify/functions` path.
2. In Netlify: Add new site → Import an existing project → pick the repo. Leave the build settings empty and deploy.
3. Site configuration → Environment variables → add:
   - `FAL_KEY`: your fal.ai API key
   - `DEMO_CODE` (recommended): a short code you share with recruiters. If it's set, visitors need it to render.
4. Redeploy so the variables take effect.

## Keeping costs safe
- fal.ai bills per image. Only keep a small amount of credit on the account (e.g. $10–20).
- With `DEMO_CODE` set, strangers can build comps and export them, but can't spend your credits.
