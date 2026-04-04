
  # Zebra Synapse

  This is a code bundle for Zebra Synapse. The original project is available at https://www.figma.com/design/K3WyblY0vqq6EYGgUiVr0y/Zebra-Synapse.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
## Production build and deploy

- `npm run build` outputs static files to `dist/`.
- `npm run preview` serves `dist` locally (smoke test before deploy).
- **Vercel**: [`vercel.json`](vercel.json) rewrites all routes to `index.html` for client-side routing.
- **Netlify**: [`public/_redirects`](public/_redirects) is copied into `dist` on build for the same behavior.
- Deploy the **contents of `dist/`** (or connect the repo and set build command `npm run build`, publish directory `dist`).

