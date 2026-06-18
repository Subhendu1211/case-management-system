CREATE TABLE "password_reset_challenges" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "identifier" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "otp_hash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX "password_reset_challenges_user_id_idx" ON "password_reset_challenges"("user_id");
CREATE INDEX "password_reset_challenges_expires_at_idx" ON "password_reset_challenges"("expires_at");
