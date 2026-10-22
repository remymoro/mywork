import { parseVisioInput } from "@/lib/visio";
import { issueVisioToken, VisioError } from "@/lib/visio-server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const failure = (error: string, status: number, code: string) => Response.json({ error, code }, { status, headers });

export async function POST(request: Request) {
  // Le navigateur doit venir du site ; ni CORS ouvert ni confiance dans un en-tête Host transmis.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return failure("Origine de la demande refusée.", 403, "origin");
  }
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return failure("Envoie une demande au format JSON.", 415, "invalid");
  }
  let input;
  try {
    const body = await request.text();
    if (body.length > 1024) return failure("Demande de visio invalide.", 400, "invalid");
    input = parseVisioInput(JSON.parse(body));
  } catch { return failure("Demande de visio invalide.", 400, "invalid"); }
  if (!input) return failure("Demande de visio invalide.", 400, "invalid");
  try {
    return Response.json(await issueVisioToken(input), { headers });
  } catch (error) {
    if (error instanceof VisioError) return failure(error.message, error.status, error.code);
    return failure("Le service de visio est indisponible. Réessaie dans un instant.", 503, "unavailable");
  }
}
