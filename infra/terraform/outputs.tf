output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain for the frontend"
  value       = module.frontend.cloudfront_domain
}

output "frontend_bucket" {
  description = "S3 bucket name for frontend assets"
  value       = module.frontend.bucket_name
}

output "ecr_api_url" {
  description = "ECR repository URL for the API image"
  value       = module.ecr.api_repository_url
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = module.cognito.client_id
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.endpoint
  sensitive   = true
}
