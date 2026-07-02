output "resource_group_name" {
  description = "Nom du resource group créé."
  value       = azurerm_resource_group.main.name
}

output "static_web_app_name" {
  description = "Nom de la Static Web App."
  value       = azurerm_static_web_app.main.name
}

output "static_web_app_default_host_name" {
  description = "URL par défaut (*.azurestaticapps.net) de la Static Web App."
  value       = azurerm_static_web_app.main.default_host_name
}

output "static_web_app_api_key" {
  description = "Jeton de déploiement à mettre dans le secret GitHub AZURE_STATIC_WEB_APPS_API_TOKEN_*."
  value       = azurerm_static_web_app.main.api_key
  sensitive   = true
}

output "storage_account_name" {
  description = "Nom du compte de stockage contenant les photos."
  value       = azurerm_storage_account.photos.name
}

output "photos_container_name" {
  description = "Nom du container blob contenant les photos."
  value       = azurerm_storage_container.photos.name
}

output "photos_container_url" {
  description = "URL de base du container photos (utile si accès public en lecture)."
  value       = "${azurerm_storage_account.photos.primary_blob_endpoint}${azurerm_storage_container.photos.name}"
}

output "storage_primary_connection_string" {
  description = "Chaîne de connexion du compte de stockage (pour upload via CLI/SDK)."
  value       = azurerm_storage_account.photos.primary_connection_string
  sensitive   = true
}
