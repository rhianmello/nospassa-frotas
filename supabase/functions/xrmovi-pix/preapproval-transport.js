// XRMOVI Mercado Pago preapproval transport (no credentials).
// Keep subscription cancellation distinct from subscription search.
export const CANCELED_STATUS = "canceled";

export function preapprovalPath(id) {
  if (typeof id !== "string" || !/^[a-z0-9]{20,72}$/i.test(id)) {
    throw new TypeError("Identificador de assinatura inválido.");
  }
  return "/preapproval/" + encodeURIComponent(id);
}

export function preapprovalSearchPath(options = {}) {
  const {payerEmail, limit = 50, offset = 0, ...unsupported} = options;
  if (Object.keys(unsupported).length) {
    throw new TypeError("Filtro não suportado na busca: " + Object.keys(unsupported).join(", "));
  }
  if (typeof payerEmail !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
    throw new TypeError("E-mail de busca inválido.");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 ||
      !Number.isInteger(offset) || offset < 0) {
    throw new TypeError("Paginação de busca inválida.");
  }
  const qs = new URLSearchParams({
    payer_email: payerEmail,
    limit: String(limit),
    offset: String(offset)
  });
  return "/preapproval/search?" + qs.toString();
}

// request(path, method='GET', body?) is the existing authenticated MP transport.
// A read-after-write is mandatory: PUT success alone does not release local billing.
export async function cancelPreapproval(request, id) {
  const path = preapprovalPath(id);
  await request(path, "PUT", {status: CANCELED_STATUS});
  return request(path, "GET");
}

export async function searchPreapprovals(request, options) {
  return request(preapprovalSearchPath(options), "GET");
}
