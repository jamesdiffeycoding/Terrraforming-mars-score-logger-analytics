variable "name_prefix"           { type = string }
variable "cognito_user_pool_id"  { type = string }
variable "cognito_client_id"     { type = string; sensitive = true }
variable "cognito_region"        { type = string }
variable "db_url"                { type = string; sensitive = true }
