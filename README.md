# Práctica de conversaciones

Chatbot que simula a un colaborador/a para practicar el modelo **Conecta · Explica · Involucra · Acuerda**.

- `/` — participantes: formulario inicial → chat → feedback con notas (1.0 a 7.0).
- `/admin` — administrador (con contraseña): todas las conversaciones evaluadas con nombre, desafío y feedback.

## Publicar (GitHub + Vercel)

1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. Antes de desplegar, agrega estas variables de entorno (Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` — tu clave de https://console.anthropic.com
   - `ADMIN_PASSWORD` — la contraseña que usarás en `/admin`
   - `ANTHROPIC_MODEL` — opcional (por defecto `claude-sonnet-5-5`)
4. Base de datos: en el proyecto de Vercel ve a **Storage → Create / Connect → Upstash Redis** (plan gratuito) y conéctala al proyecto. Vercel agrega las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` automáticamente.
5. Haz **Deploy** (o *Redeploy* si agregaste la base de datos después).

Los participantes usan la URL principal; tú entras a `tu-url.vercel.app/admin`.

## Desarrollo local

```bash
cp .env.example .env.local   # completa los valores
npm install
npm run dev
```

Sin base de datos configurada todo funciona, pero el feedback no se guarda.

## Ajustes rápidos

- Probabilidad de colaborador/a más difícil: `rollDisposition()` en `app/page.js` (hoy 30%).
- Comportamiento del colaborador/a y criterios de evaluación: `lib/prompts.js`.
