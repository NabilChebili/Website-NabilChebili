variable "subscription_id" {
  description = "ID de la subscription Azure cible (sub-ishane-nch)."
  type        = string
  default     = "2b079b5a-5da0-427c-a95a-53913e2af58c"
}

variable "project_name" {
  description = "Nom court du projet, utilisé comme préfixe pour nommer les ressources."
  type        = string
  default     = "nch"
}

variable "environment" {
  description = "Nom de l'environnement (production, staging, ...)."
  type        = string
  default     = "production"
}

variable "location" {
  description = "Région Azure unique pour toutes les ressources (contrainte par Static Web Apps, qui n'est disponible qu'en centralus, eastus2, westus2, westeurope ou eastasia)."
  type        = string
  default     = "westeurope"

  validation {
    condition     = contains(["centralus", "eastus2", "westus2", "westeurope", "eastasia"], var.location)
    error_message = "location doit être une région supportant Azure Static Web Apps : centralus, eastus2, westus2, westeurope ou eastasia."
  }
}

variable "resource_group_name" {
  description = "Nom du resource group Azure. Laisser vide pour en générer un automatiquement."
  type        = string
  default     = ""
}

variable "tags" {
  description = "Tags communs appliqués à toutes les ressources."
  type        = map(string)
  default = {
    project     = "nch"
    managed_by  = "terraform"
    environment = "production"
  }
}

# --- Static Web App ---

variable "static_web_app_name" {
  description = "Nom de la Static Web App Azure. Laisser vide pour en générer un automatiquement."
  type        = string
  default     = ""
}

variable "static_web_app_sku_tier" {
  description = "Tier du SKU de la Static Web App (Free ou Standard)."
  type        = string
  default     = "Free"

  validation {
    condition     = contains(["Free", "Standard"], var.static_web_app_sku_tier)
    error_message = "static_web_app_sku_tier doit être \"Free\" ou \"Standard\"."
  }
}

variable "custom_domain" {
  description = "Nom de domaine personnalisé à rattacher à la Static Web App (ex: www.nabilchebili.fr). Laisser vide pour ne pas en créer."
  type        = string
  default     = ""
}

# --- Storage Account (photos) ---

variable "storage_account_tier" {
  description = "Tier du compte de stockage (Standard ou Premium)."
  type        = string
  default     = "Standard"
}

variable "storage_account_replication_type" {
  description = "Type de réplication du compte de stockage (LRS, GRS, RAGRS, ZRS, ...)."
  type        = string
  default     = "LRS"
}

variable "photos_container_name" {
  description = "Nom du container blob qui contiendra les photos."
  type        = string
  default     = "photos"
}

variable "photos_container_access_type" {
  description = "Niveau d'accès public du container photos : \"private\", \"blob\" (lecture anonyme des blobs) ou \"container\" (lecture anonyme + listing)."
  type        = string
  default     = "blob"

  validation {
    condition     = contains(["private", "blob", "container"], var.photos_container_access_type)
    error_message = "photos_container_access_type doit être \"private\", \"blob\" ou \"container\"."
  }
}
