// Ultra-minimal health endpoint for Railway
export async function GET() {
  return Response.json({ ok: true }, { status: 200 })
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}
