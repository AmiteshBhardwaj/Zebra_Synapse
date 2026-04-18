# Zebra Synapse Repository Wrapper

This repository keeps a thin submission wrapper at the root and the actual product inside [`zebra-synapse/`](./zebra-synapse).

## Start Here

1. Open [`zebra-synapse/README.md`](./zebra-synapse/README.md).
2. Follow the local setup or deployment section there.
3. Use [`zebra-synapse/demo.md`](./zebra-synapse/demo.md) only for judge-facing demo flow.

## Repository Layout

```text
.
|-- .github/             CI and repository automation
|-- README.md            submission wrapper and navigation entry
|-- requirements.txt     top-level toolchain note for wrapper context
|-- vercel.json          wrapper build forwarding into zebra-synapse/
`-- zebra-synapse/       sole product root
    |-- src/             application code
    |-- supabase/        database schema, migrations, Edge Functions
    |-- docs/            supplementary documentation only
    |-- research/        archived research and experiment artifacts
    |-- screenshots/     submission and demo images
    `-- README.md        canonical setup, deploy, and ops guide
```

## Canonical Documents

- Setup, deployment, operations: [`zebra-synapse/README.md`](./zebra-synapse/README.md)
- System design: [`zebra-synapse/architecture.md`](./zebra-synapse/architecture.md)
- Supplementary developer docs: [`zebra-synapse/docs/`](./zebra-synapse/docs)

## Notes

- Product runtime code stays inside `zebra-synapse/`.
- Research material and demo assets stay outside `src/`, `public/`, and `supabase/`.
- Root `vercel.json` exists only to forward build/install/output behavior to `zebra-synapse/`.
