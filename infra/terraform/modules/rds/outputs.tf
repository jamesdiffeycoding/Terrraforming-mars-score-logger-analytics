output "endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "connection_url" {
  value     = "postgresql://${var.db_username}:${random_password.db.result}@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive = true
}
