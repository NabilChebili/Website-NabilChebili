# Noms générés selon les conventions du Cloud Adoption Framework Azure
# (préfixes officiels CAF : rg-, stapp-, st, cf. https://learn.microsoft.com/azure/cloud-adoption-framework/ready/azure-best-practices/resource-naming)

resource "azurecaf_name" "stapp" {
  name          = var.project_name
  resource_type = "azurerm_static_site"
  suffixes      = [var.environment]
  random_length = 4
}

resource "azurecaf_name" "st" {
  name          = var.project_name
  resource_type = "azurerm_storage_account"
  suffixes      = [var.environment]
  random_length = 4
}

locals {
  # Nommage CAF simple, sans indirection via une ressource : le resource group n'a pas de
  # contrainte d'unicité globale ni de caractères, donc pas besoin d'azurecaf_name ici (et ça
  # évite un remplacement forcé du RG existant à chaque plan).
  resource_group_name = var.resource_group_name != "" ? var.resource_group_name : "rg-${var.project_name}-${var.environment}"

  static_web_app_name  = var.static_web_app_name != "" ? var.static_web_app_name : azurecaf_name.stapp.result
  storage_account_name = azurecaf_name.st.result
}

resource "azurerm_resource_group" "main" {
  name     = local.resource_group_name
  location = var.location
  tags     = var.tags
}

# --- Static Web App (héberge le site Astro "portfolio-photo" + l'API "/api") ---

resource "azurerm_static_web_app" "main" {
  name                = local.static_web_app_name
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku_tier            = var.static_web_app_sku_tier
  sku_size            = var.static_web_app_sku_tier
  tags                = var.tags
}

resource "azurerm_static_web_app_custom_domain" "main" {
  count             = var.custom_domain != "" ? 1 : 0
  static_web_app_id = azurerm_static_web_app.main.id
  domain_name       = var.custom_domain
  validation_type   = "cname-delegation"
}

# --- Storage Account pour les photos du portfolio ---

resource "azurerm_storage_account" "photos" {
  name                     = local.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_account_replication_type
  access_tier              = "Hot"
  min_tls_version          = "TLS1_2"
  tags                     = var.tags
}

resource "azurerm_storage_container" "photos" {
  name                  = var.photos_container_name
  storage_account_id    = azurerm_storage_account.photos.id
  container_access_type = var.photos_container_access_type
}
