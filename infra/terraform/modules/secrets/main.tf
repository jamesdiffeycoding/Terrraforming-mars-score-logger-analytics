resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.name_prefix}/app-secrets"
  recovery_window_in_days = 7

  tags = { Name = "${var.name_prefix}-app-secrets" }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    DATABASE_URL          = var.db_url
    COGNITO_USER_POOL_ID  = var.cognito_user_pool_id
    COGNITO_CLIENT_ID     = var.cognito_client_id
    COGNITO_REGION        = var.cognito_region
    NODE_ENV              = "production"
    PORT                  = "3001"
  })
}
