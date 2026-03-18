# 3D models (homepage background)

## Pine tree GLB

Place a single low-poly pine tree model here as:

**`pine-tree.glb`**

By default the app **does not** request this file (no 404 in the console).

1. Add **`pine-tree.glb`** to this folder.
2. In **`frontend/.env.local`** set:

   ```bash
   NEXT_PUBLIC_PINES_GLB=1
   ```

3. Restart the dev server / rebuild. If the file is missing or invalid, **procedural cone trees** are used instead.

### Suggested sources (check license before use)

- [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) (CC0)
- [Quaternius Ultimate Nature Pack](https://quaternius.com/packs/ultimatenature.html) (CC0)
- [Poly Haven](https://polyhaven.com/models) (CC0)

Export one pine as **GLB** and name it `pine-tree.glb`.
