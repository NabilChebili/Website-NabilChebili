# Terraform - infrastructure Azure

Ce dossier provisionne l'infrastructure Azure pour le site **portfolio-photo** :

- Un **Resource Group**
- Une **Azure Static Web App** (hébergement du site Astro `portfolio-photo` + de l'API `/api`)
- Un **Storage Account** avec un container blob `photos`, destiné à stocker les photos du portfolio

## Prérequis

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.6
- Azure CLI connecté (`az login`) avec un abonnement actif (`az account set --subscription <id>`)

## Utilisation

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # puis adapter si besoin
terraform init
terraform plan
terraform apply
```

## Après l'apply

- `terraform output static_web_app_default_host_name` : URL par défaut de la Static Web App
- `terraform output -raw static_web_app_api_key` : jeton de déploiement à coller dans le secret
  GitHub Actions `AZURE_STATIC_WEB_APPS_API_TOKEN_...` utilisé par
  `.github/workflows/azure-static-web-apps-*.yml`
- `terraform output storage_account_name` : nom du compte de stockage des photos
- `terraform output photos_container_url` : URL de base du container `photos` (si accès public en lecture)
- `terraform output -raw storage_primary_connection_string` : chaîne de connexion pour uploader des
  photos via Azure CLI, Storage Explorer ou un SDK

### Uploader une photo

```bash
az storage blob upload \
  --account-name <storage_account_name> \
  --container-name photos \
  --name ma-photo.jpg \
  --file ./ma-photo.jpg \
  --connection-string "<storage_primary_connection_string>"
```

## Site existant déjà déployé manuellement

Une Static Web App (`black-glacier-0a60bca03`) existe déjà et est pilotée par le workflow
`.github/workflows/azure-static-web-apps-black-glacier-0a60bca03.yml`. Deux options :

1. **Nouvel environnement piloté par Terraform** : laisser ce Terraform créer une nouvelle
   Static Web App (nom généré automatiquement), puis mettre à jour le secret GitHub Actions
   avec le nouveau jeton de déploiement (`static_web_app_api_key`).
2. **Reprendre l'existant sous Terraform** : importer la ressource existante au lieu d'en créer
   une nouvelle :

   ```bash
   terraform import azurerm_static_web_app.main /subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Web/staticSites/black-glacier-0a60bca03
   ```

   puis ajuster `static_web_app_name` / `resource_group_name` dans `terraform.tfvars` pour
   correspondre aux valeurs réelles avant de relancer `terraform plan`.

## Domaine personnalisé

Pour rattacher `www.nabilchebili.fr`, renseigner `custom_domain` dans `terraform.tfvars` puis
`terraform apply`. Azure fournit alors un enregistrement DNS de validation (CNAME/TXT) à créer chez
votre registrar avant que le domaine ne devienne actif.

## Coût estimé

Configuration volontairement optimisée pour rester très en dessous de 30 €/mois :

| Ressource | Choix | Coût |
| --- | --- | --- |
| Static Web App | SKU `Free` | 0 € (100 Go de bande passante/mois inclus, domaine perso gratuit) |
| Storage Account | `Standard` / réplication `LRS` (la moins chère) / tier d'accès `Hot` | ≈ 0,018 €/Go/mois stocké + transactions négligeables |

Pour un portfolio photo (quelques Go de photos, trafic modéré), le coût réel se situe en pratique
entre **0 € et quelques euros par mois**, très loin du plafond de 30 €. Points à surveiller si le
volume ou le trafic explose :

- Bande passante de la Static Web App > 100 Go/mois (peu probable pour un portfolio perso) →
  facturée en supplément sur le tier Free.
- Le tier d'accès `Hot` du storage est volontairement conservé (et non `Cool`/`Archive`) car les
  photos sont servies en direct sur le site : `Cool`/`Archive` sont moins chers au Go stocké mais
  facturent des frais de lecture par Go bien plus élevés, ce qui coûterait plus cher au global pour
  des images consultées régulièrement.
- La réplication `LRS` (mono-région) est la moins chère ; passer en `GRS`/`ZRS` augmenterait le coût
  sans nécessité pour ce cas d'usage.
