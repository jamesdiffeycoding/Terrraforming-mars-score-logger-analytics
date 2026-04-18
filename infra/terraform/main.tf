terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    # Populate via -backend-config or terraform.tfvars at init time
    # bucket         = "your-tfstate-bucket"
    # key            = "terraforming-mars/terraform.tfstate"
    # region         = "eu-west-1"
    # dynamodb_table = "terraform-lock"
    # encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "terraforming-mars"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ── Modules ───────────────────────────────────────────────────────────────────

module "vpc" {
  source      = "./modules/vpc"
  name_prefix = local.name_prefix
  az_count    = var.az_count
}

module "cognito" {
  source      = "./modules/cognito"
  name_prefix = local.name_prefix
  environment = var.environment
}

module "rds" {
  source               = "./modules/rds"
  name_prefix          = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  db_security_group_id = module.vpc.db_security_group_id
  db_name              = var.db_name
  db_username          = var.db_username
  db_instance_class    = var.db_instance_class
}

module "secrets" {
  source              = "./modules/secrets"
  name_prefix         = local.name_prefix
  cognito_user_pool_id = module.cognito.user_pool_id
  cognito_client_id   = module.cognito.client_id
  cognito_region      = var.aws_region
  db_url              = module.rds.connection_url
}

module "ecr" {
  source      = "./modules/ecr"
  name_prefix = local.name_prefix
}

module "alb" {
  source                = "./modules/alb"
  name_prefix           = local.name_prefix
  vpc_id                = module.vpc.vpc_id
  public_subnet_ids     = module.vpc.public_subnet_ids
  alb_security_group_id = module.vpc.alb_security_group_id
  certificate_arn       = var.acm_certificate_arn
}

module "ecs" {
  source               = "./modules/ecs"
  name_prefix          = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  private_subnet_ids   = module.vpc.private_subnet_ids
  ecs_security_group_id = module.vpc.ecs_security_group_id
  alb_target_group_arn = module.alb.api_target_group_arn
  ecr_image_uri        = "${module.ecr.api_repository_url}:latest"
  secrets_arn          = module.secrets.secret_arn
  task_cpu             = var.task_cpu
  task_memory          = var.task_memory
  desired_count        = var.desired_count
}

module "frontend" {
  source      = "./modules/frontend"
  name_prefix = local.name_prefix
  api_domain  = module.alb.dns_name
}

# ── Locals ────────────────────────────────────────────────────────────────────

locals {
  name_prefix = "tm-${var.environment}"
}
