# Grist Email Composer Pro Widget

Widget Grist pour composer et envoyer des emails en masse via le client mail de l'utilisateur (Outlook, Thunderbird, etc.).

## Fonctionnalités

- 📬 **Sélection de destinataires** - Choisissez les destinataires depuis n'importe quelle table Grist
- 📋 **Templates d'emails** - 5 templates pré-configurés (invitation, rappel, confirmation, etc.)
- 🔄 **Variables dynamiques** - Utilisez `{{Nom}}`, `{{Email}}`, etc. dans vos messages
- 🎨 **Interface façon Outlook** - Design moderne et intuitif
- 🔒 **Sécurisé** - Aucun serveur SMTP, utilise le client mail local
- 💾 **Sauvegarde automatique** - Mémorise vos préférences

## Installation

1. Dans Grist, ajoutez un widget personnalisé
2. URL : `https://isaytoo.github.io/grist-email-composer-widget/`
3. Niveau d'accès : **Accès complet au document**

## Utilisation

1. **Sélectionnez une table** contenant les emails des destinataires
2. **Mappez les colonnes** Email et Nom
3. **Cochez les destinataires** que vous souhaitez contacter
4. **Rédigez votre message** (utilisez les variables et templates)
5. **Cliquez sur "Composer l'email"** → Votre client mail s'ouvre

## Sécurité

Ce widget n'envoie aucune donnée à un serveur externe. Il utilise le protocole `mailto:` pour ouvrir le client mail de l'utilisateur avec l'email pré-rempli.

## Licence

Apache License 2.0

## Auteur

Said Hamadou (isaytoo) - [gristup.fr](https://gristup.fr)
