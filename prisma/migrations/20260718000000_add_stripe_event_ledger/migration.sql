-- [R1/F7-prep] StripeEvent: ledger de eventos de webhook procesados — dedupe por event.id.
-- Stripe reintenta webhooks; sin este ledger el mismo checkout.session.completed entregado dos
-- veces podía otorgar acceso dos veces (gap fijado por tests/api-stripe-webhook en F5). La PK es
-- el event.id de Stripe: el INSERT duplicado falla y la ruta responde 200 sin repetir efectos.
-- Solo-escritura: nunca se borra (rastro de pagos).

-- CreateTable
CREATE TABLE "StripeEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeEvent_pkey" PRIMARY KEY ("id")
);
