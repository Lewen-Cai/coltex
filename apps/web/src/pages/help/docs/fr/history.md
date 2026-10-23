# Historique

**Historique** en haut de l’éditeur ouvre la vue de l’historique. Elle fonctionne comme un git log : chaque version a un identifiant court (comme `a1b2c3d`), une description, sa date et son auteur.

- Les versions sont enregistrées automatiquement après une pause dans l’édition, avec les auteurs des modifications.
- **Enregistrer la version** enregistre l’état actuel tout de suite, avec votre description (comme un message de commit). Si rien n’a changé depuis la dernière version, la description devient une étiquette sur celle-ci.
- Sélectionnez une version pour voir quels fichiers elle a modifiés et comment, ou comparez-la avec le projet actuel.
- **Annuler ces modifications** annule uniquement ce que cette version a changé et conserve tout ce qui a changé depuis (comme `git revert`). Si un fichier a été modifié depuis d’une façon incompatible, rien n’est changé et le fichier est indiqué.
- **Restaurer le projet** ramène chaque fichier à son état dans cette version ; les fichiers ajoutés depuis sont supprimés. **Restaurer ce fichier** fait de même pour un seul fichier.
- Les annulations et les restaurations sont des versions à part entière (« Annule a1b2c3d », « Retour à a1b2c3d » ; cliquez sur l’identifiant pour aller à cette version) : elles peuvent donc elles aussi être annulées.
- **Ajouter une étiquette** nomme une version (p. ex. « Soumis ») pour la retrouver plus tard.
- Les fichiers de n’importe quelle version peuvent être téléchargés en .zip.

> Une version est aussi enregistrée avant l’application de modifications de l’IA, avant un remplacement dans tout le projet, un git push, une annulation de version et une restauration.
