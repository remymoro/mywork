// Envoi d'e-mails par Resend (https://resend.com/docs/api-reference/emails/send-email), sans dépendance :
// un simple appel HTTP. Sans clé `RESEND_API_KEY`, rien ne part : le message est écrit dans les journaux du
// serveur, et l'application continue de fonctionner (voir docs/rendez-vous.md, « Resend »).

export type Email = { to: string; subject: string; text: string; html: string };
export type SendResult = { sent: boolean; reason?: "no-key" | "error" };

const DEFAULT_FROM = "MyWork <onboarding@resend.dev>";

/** Ne lève jamais d'erreur : un e-mail raté ne doit pas faire échouer une réservation. */
export async function sendEmail(email: Email, fetchImpl: typeof fetch = fetch): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`[e-mail non envoyé : pas de clé Resend] à ${email.to} — ${email.subject}\n${email.text}`);
    return { sent: false, reason: "no-key" };
  }
  try {
    const response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!response.ok) {
      console.error(`[e-mail refusé par Resend] ${response.status} à ${email.to} — ${email.subject}`);
      return { sent: false, reason: "error" };
    }
    return { sent: true };
  } catch (error) {
    console.error("[e-mail : échec de l'envoi]", error);
    return { sent: false, reason: "error" };
  }
}
