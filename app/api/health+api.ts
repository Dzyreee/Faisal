// Reads the server-only secret. This file is the ONLY place FAKE_KEY is touched.
// It returns whether the key was readable — never the value itself.
export function GET(): Response {
  return Response.json({
    ok: true,
    keyLoaded: Boolean(process.env.FAKE_KEY),
  });
}
