-- Migration 001: Add reset_token and reset_expires to usuarios
-- Required by AuthController::forgotPassword() and AuthController::resetPassword()

ALTER TABLE usuarios
  ADD COLUMN reset_token VARCHAR(255) NULL DEFAULT NULL AFTER google_id,
  ADD COLUMN reset_expires DATETIME NULL DEFAULT NULL AFTER reset_token;
