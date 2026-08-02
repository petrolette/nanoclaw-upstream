// French rendering of `ncl <resource> help`.
//
// The help text is produced by the CLI, in English. This catalogue holds only
// the PROSE: the resource description, each verb's sentence, and each field's
// sentence. Everything mechanical — verb names, flag names, enum tokens, the
// `(required, updatable)` / `(values: …)` annotations — is handled by
// help.js and is never stored here.
//
// A missing entry means the English sentence is shown as-is, so partial
// coverage degrades one line at a time. `test/help-i18n.test.js` checks this
// catalogue against captured fixtures of the real CLI output and fails when a
// verb or field is left untranslated.

export const HELP_FR = {
  approvals: {
    description:
      "Approbation en attente — cartes d'approbation en cours, en attente d'une réponse d'un administrateur. Créées par requestApproval() (auto-modification install_packages/add_mcp_server) et par le flux d'approbation des identifiants OneCLI. Les lignes sont supprimées une fois que l'administrateur approuve ou refuse, ou quand la demande expire.",
    verbs: {},
    fields: {
      '--approval-id': "Identifiant unique de l'approbation (sert aussi de questionId à la carte).",
      '--session-id': "Session à l'origine de la demande. Nul pour les approbations d'identifiants OneCLI.",
      '--request-id': "Identifiant de la demande d'origine (UUID de requête OneCLI, ou identique à approval_id).",
      '--action': "Type d'action — correspond au gestionnaire d'approbation enregistré (p. ex. install_packages, add_mcp_server, onecli_credential).",
      '--payload': "Charge utile JSON transmise telle quelle au gestionnaire d'approbation.",
      '--created-at': 'Renseigné automatiquement.',
      '--agent-group-id': "Groupe d'agent à l'origine de la demande.",
      '--channel-type': "Canal sur lequel la carte d'approbation a été envoyée.",
      '--platform-id': "Identifiant de conversation, côté plateforme, où la carte a été envoyée.",
      '--platform-message-id': "Identifiant du message de la carte envoyée, côté plateforme (pour la modifier à l'expiration).",
      '--expires-at': "Date d'expiration de cette approbation (durée de vie côté passerelle OneCLI).",
      '--status': 'Statut actuel.',
      '--title': "Titre de la carte présenté à l'administrateur.",
      '--options-json': 'Boutons de la carte, sous forme de tableau JSON.',
    },
  },

  destinations: {
    description:
      "Destination d'agent — entrée de routage et liste de contrôle d'accès, propre à un agent. Chaque ligne autorise un agent à envoyer des messages vers une cible (un canal ou un autre agent) et lui attribue le nom local par lequel l'agent la désigne. Les noms sont propres à l'agent source : deux agents peuvent donner des noms locaux différents à la même cible. Créées automatiquement au câblage d'un canal, ou quand un agent crée un agent enfant.",
    verbs: {
      list: 'Liste les destinations avec les libellés de canal et de titre résolus.',
      add: "Ajoute une destination à un agent. Utiliser --agent-group-id, --local-name, --target-type, --target-id.",
      remove: "Retire une destination d'un agent. Utiliser --agent-group-id et --local-name.",
    },
    fields: {
      '--agent-group-id': "L'agent propriétaire de cette destination. Référence agent_groups.id.",
      '--local-name': "Nom par lequel l'agent désigne cette cible (p. ex. send_message({ to: \"local_name\", ... })). Unique par agent. En minuscules, séparé par des tirets.",
      '--target-type': "\"channel\" pour une cible de type groupe de discussion, \"agent\" pour une cible d'agent à agent.",
      '--target-id': "Identifiant de la cible — messaging_groups.id pour un canal, agent_groups.id pour un agent.",
      '--channel-type': 'Type de canal résolu, pour les destinations de type canal.',
      '--display-name': "Titre de la conversation ou nom de l'agent, résolu.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  'dropped-messages': {
    description:
      "Journal des messages rejetés — recense les messages écartés par le routeur ou par le contrôle d'accès. Agrégés par (channel_type, platform_id) avec un compteur cumulé. Motifs possibles : no_agent_wired (aucun câblage), no_agent_engaged (câblage présent mais les règles de déclenchement n'ont pas joué), unknown_sender_strict (expéditeur inconnu, politique stricte), unknown_sender_request_approval (expéditeur inconnu, approbation demandée).",
    verbs: {},
    fields: {
      '--channel-type': "Type d'adaptateur de canal du message rejeté.",
      '--platform-id': 'Identifiant de conversation, côté plateforme, où le message a été rejeté.',
      '--user-id': "Identifiant de l'expéditeur s'il a pu être résolu, nul sinon.",
      '--sender-name': "Nom affiché de l'expéditeur, s'il est disponible.",
      '--reason': 'Motif du rejet du message.',
      '--messaging-group-id': "Identifiant du groupe de discussion, s'il a pu être résolu.",
      '--agent-group-id': "Identifiant du groupe d'agent visé, s'il a pu être résolu.",
      '--message-count': 'Nombre de messages rejetés de cet expéditeur sur cette conversation.',
      '--first-seen': 'Horodatage du premier rejet.',
      '--last-seen': 'Horodatage du rejet le plus récent.',
    },
  },

  groups: {
    description:
      "Groupe d'agent — une identité d'agent logique. Chaque groupe a son propre dossier de travail (CLAUDE.md, skills, configuration du conteneur), son historique de conversation et son image de conteneur. Plusieurs groupes de discussion peuvent être câblés vers un même groupe d'agent.",
    verbs: {
      create:
        "Crée le groupe d'agent avec sa configuration de conteneur (ou renvoie celui qui existe déjà). Idempotent sur --folder. Avec --template <réf>, part d'un modèle local sous templates/ (serveurs MCP + instructions + skills + tâches récurrentes en pause). Utiliser --folder <slug> et --name <nom affiché>. En option, --timezone <identifiant IANA> fixe le fuseau du groupe (les tâches du modèle se déclenchent dans ce fuseau) ; comme --name, il est ignoré si le dossier existe déjà.",
      delete:
        "Supprime un groupe d'agent et les lignes qui en dépendent (sessions, destinations, approbations, attributions de rôles, adhésions, câblages de canaux). Cascade ordonnée par clés étrangères, en une seule transaction. Utiliser --id <id-du-groupe>. Hors périmètre : arrêter les conteneurs en cours, et le nettoyage sur disque de groups/<dossier>/ et data/v2-sessions/<id-du-groupe>/.",
      restart:
        "Redémarre les conteneurs d'un groupe. Utiliser --id <id-du-groupe> [--rebuild] [--message <texte>]. Depuis l'intérieur d'un conteneur, --id est rempli automatiquement et seule la session appelante est redémarrée. --rebuild reconstruit d'abord l'image du conteneur (nécessaire après un changement de paquets). --message fixe une instruction de réveil que le nouveau conteneur traitera au démarrage — à utiliser quand il faut poursuivre après le redémarrage (p. ex. vérifier qu'un nouvel outil fonctionne, prévenir l'utilisateur). Sans --message, le conteneur s'arrête et ne repart qu'au prochain message de l'utilisateur.",
      'config get': "Affiche la configuration de conteneur d'un groupe. Utiliser --id <id-du-groupe>.",
      'config update':
        "Modifie les champs simples de la configuration de conteneur. Les changements sont enregistrés mais ne prennent PAS effet avant un `ncl groups restart`. Utiliser --id <id-du-groupe> et l'une des options : --provider, --model, --effort, --image-tag, --assistant-name, --max-messages-per-prompt, --cli-scope, --timezone (identifiant IANA comme \"Europe/Lisbon\" ; \"\" revient au défaut de l'installation ; les horaires des tâches planifiées suivent immédiatement, l'affichage des messages après redémarrage).",
      'config add-mcp-server':
        "Ajoute un serveur MCP à un groupe. Nécessite `ncl groups restart` pour prendre effet. Utiliser --id <id-du-groupe> --name <nom-du-serveur> --command <cmd> [--args <tableau-json>] [--env <objet-json>].",
      'config remove-mcp-server':
        "Retire un serveur MCP d'un groupe. Nécessite `ncl groups restart` pour prendre effet. Utiliser --id <id-du-groupe> --name <nom-du-serveur>.",
      'config add-package':
        "Ajoute un paquet à un groupe. Nécessite `ncl groups restart --rebuild` pour prendre effet. Utiliser --id <id-du-groupe> et --apt <paquet> ou --npm <paquet>.",
      'config remove-package':
        "Retire un paquet d'un groupe. Nécessite `ncl groups restart --rebuild` pour prendre effet. Utiliser --id <id-du-groupe> et --apt <paquet> ou --npm <paquet>.",
      'config add-mount':
        "Monte un répertoire de l'hôte dans les conteneurs d'un groupe. RÉSERVÉ À L'OPÉRATEUR — jamais exécutable depuis l'intérieur d'un conteneur (monter un chemin de l'hôte est une frontière d'accès au système de fichiers). Nécessite `ncl groups restart` pour prendre effet. Utiliser --id <id-du-groupe> --host <chemin-hôte> --container <chemin-conteneur> [--ro].",
      'config remove-mount':
        "Retire un montage de l'hôte d'un groupe. RÉSERVÉ À L'OPÉRATEUR. Nécessite `ncl groups restart` pour prendre effet. Utiliser --id <id-du-groupe> --host <chemin-hôte> --container <chemin-conteneur>.",
    },
    fields: {
      '--id': 'UUID.',
      '--name': "Nom affiché dans les journaux, les sorties d'aide et les adaptateurs de canaux. N'a pas besoin d'être unique.",
      '--folder': "Nom du répertoire sous groups/ sur l'hôte. Doit être unique. Contient CLAUDE.md, skills/ et container.json. Non modifiable après création.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  members: {
    description:
      "Membre d'un groupe d'agent — autorise un utilisateur sans privilège à interagir avec un groupe d'agent. Les utilisateurs ayant le rôle administrateur ou propriétaire sur le groupe en sont membres implicitement et n'ont pas besoin d'une ligne d'adhésion distincte. L'adhésion est vérifiée par le routeur quand sender_scope vaut \"known\".",
    verbs: {
      add: "Ajoute un utilisateur comme membre d'un groupe d'agent. Utiliser --user et --group.",
      remove: "Retire un utilisateur d'un groupe d'agent. Utiliser --user et --group.",
    },
    fields: {
      '--user-id': "L'utilisateur à qui accorder l'adhésion. Doit référencer un utilisateur existant (users.id).",
      '--agent-group-id': "Le groupe d'agent auquel donner accès. Doit référencer un groupe d'agent existant (agent_groups.id).",
      '--added-by': "Identifiant de l'utilisateur ayant ajouté ce membre. Informatif — non contrôlé.",
      '--added-at': "Horodatage ISO 8601 de l'attribution de l'adhésion.",
    },
  },

  'messaging-groups': {
    description:
      "Groupe de discussion — une conversation ou un canal sur une plateforme (un message privé Telegram, un salon Discord, une racine de fil Slack, une adresse email). L'identité est le triplet (channel_type, platform_id, instance), qui doit être unique.",
    verbs: {
      send:
        "Injecte un message dans un groupe de discussion comme si un expéditeur l'avait publié, ce qui réveille l'agent câblé — sert à envoyer un mot de bienvenue au premier câblage. Utiliser --channel-type, --platform-id, --text, et en option --instance, --sender-id, --sender.",
    },
    fields: {
      '--id': 'UUID.',
      '--channel-type': "Type d'adaptateur de canal — correspond à l'adaptateur installé par /add-<canal> (p. ex. telegram, discord, slack, whatsapp).",
      '--platform-id': "Identifiant de conversation propre à la plateforme. Le format varie : identifiant de conversation Telegram, snowflake de salon Discord, identifiant de canal Slack, numéro de téléphone, adresse email.",
      '--instance': "Instance d'adaptateur propriétaire de cette conversation, quand on fait tourner N adaptateurs d'un même type de canal. Vaut channel_type (l'instance par défaut) si omis.",
      '--name': "Nom affiché. Souvent renseigné automatiquement par l'adaptateur de canal.",
      '--is-group': 'Conversation de groupe multi-utilisateurs (1) ou message privé (0). Influe sur le périmètre des sessions.',
      '--unknown-sender-policy':
        "Ce qui se passe quand un expéditeur non reconnu écrit. \"strict\" rejette en silence. \"request_approval\" envoie une carte d'approbation à un administrateur. \"public\" autorise tout le monde. Par défaut : ce que déclare l'adaptateur de canal pour ce contexte (message privé ou groupe) ; \"strict\" si le canal ne déclare rien.",
      '--denied-at': "Renseigné quand le propriétaire refuse explicitement d'enregistrer ce canal. Tant que c'est renseigné, le routeur rejette tous les messages en silence, sans nouvelle escalade. Effacé par toute modification explicite du câblage.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  policies: {
    description:
      "Politique d'approbation d'agent à agent. Une ligne impose que chaque message d'un agent vers un autre soit approuvé par un humain avant livraison — sans défaire le câblage. Aucune ligne = circulation libre. Orientée et par paire : pour verrouiller les deux sens, il faut deux politiques. Réservé à l'opérateur (les agents ne peuvent pas gérer leurs propres verrous).",
    verbs: {
      set: "Impose une approbation pour les messages d'un agent vers un autre. Utiliser --from <id-groupe-agent> --to <id-groupe-agent> --approver <id-utilisateur>. Seul l'approbateur désigné (ou un propriétaire) peut approuver.",
      remove: "Retire une politique d'approbation (retour à la circulation libre). Utiliser --from <id-groupe-agent> --to <id-groupe-agent>.",
    },
    fields: {
      '--from-agent-group-id': "Groupe d'agent source. Référence agent_groups.id.",
      '--to-agent-group-id': "Groupe d'agent cible. Référence agent_groups.id.",
      '--approver': "Identifiant de l'utilisateur qui approuve chaque message filtré (requis). Seul cet utilisateur (ou un propriétaire) peut approuver.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  roles: {
    description:
      "Rôle d'utilisateur — attribution de privilège. \"owner\" est toujours global et donne le contrôle total. \"admin\" peut être global (agent_group_id nul) ou limité à un groupe d'agent précis. Être administrateur d'un groupe implique d'en être membre. Le routage des approbations privilégie les administrateurs et propriétaires joignables sur la même plateforme que l'origine de la demande (p. ex. une demande venue de Telegram envoie si possible la carte à un administrateur sur Telegram).",
    verbs: {
      grant: "Attribue un rôle. Utiliser --user, --role, et éventuellement --group pour un administrateur limité à un groupe.",
      revoke: "Retire un rôle. Utiliser --user, --role, et --group s'il est limité à un groupe.",
    },
    fields: {
      '--user-id': "Utilisateur qui reçoit le rôle. Doit exister dans la table users.",
      '--role': "\"owner\" donne le contrôle total, toujours global. \"admin\" peut gérer les groupes et approuver des actions.",
      '--agent-group-id': "Nul = global (tous les groupes). Un identifiant précis limite le rôle à ce groupe. Pour un propriétaire, doit toujours être nul.",
      '--granted-by': 'Qui a attribué ce rôle. Informatif.',
      '--granted-at': 'Renseigné automatiquement.',
    },
  },

  sessions: {
    description:
      "Session — l'unité d'exécution. Associe une combinaison (groupe d'agent, groupe de discussion, fil) à un conteneur doté de ses propres inbound.db et outbound.db. Créée automatiquement par le routeur à l'arrivée d'un message.",
    verbs: {},
    fields: {
      '--id': 'UUID.',
      '--agent-group-id': "Groupe d'agent que fait tourner cette session.",
      '--messaging-group-id': "Groupe de discussion servi par cette session. Nul pour les sessions partagées par agent.",
      '--thread-id': 'Identifiant du fil. Renseigné uniquement en mode session par fil.',
      '--agent-provider': "Fournisseur imposé. Nul signifie qu'on hérite du groupe d'agent.",
      '--status': '"active" reçoit les messages. "closed" est archivée.',
      '--container-status':
        "\"running\" — conteneur vivant et en écoute. \"stopped\" — conteneur arrêté ; la ronde le redémarrera automatiquement à l'arrivée de messages dus. \"idle\" — réservé, inutilisé pour l'instant.",
      '--last-active': "Dernier message ou battement de cœur. Sert à détecter les sessions en perdition.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  tasks: {
    description:
      "Tâche planifiée — une consigne et une heure d'exécution. Les tâches s'exécutent depuis la session système du groupe d'agent, et l'agent choisit la destination de livraison au moment du déclenchement.",
    verbs: {
      list: "Liste les tâches vivantes avec l'historique d'exécution par série (planification, exécutions, échecs, prochain déclenchement).",
      get: 'Récupère une tâche par son identifiant de série.',
      create: "Crée une tâche planifiée (récurrente ou unique) dans la session système du groupe d'agent.",
      'append-log': "Ajoute une note d'une ligne au journal d'exécution d'une tâche (tasks/<id>.md).",
      update: 'Modifie une tâche vivante par son identifiant de série.',
      cancel: "Annule une tâche vivante par son identifiant de série, ou utiliser --all comme coupe-circuit.",
      run: "Déclenche une tâche immédiatement sans toucher à sa planification (met en file une exécution supplémentaire due tout de suite). Sans danger pour un test — contrairement à update --process-after now, cela ne consomme pas une tâche unique et ne fait pas avancer une série récurrente.",
      pause: "Met en pause une tâche en attente, par son identifiant de série.",
      resume: "Relance une tâche en pause, par son identifiant de série.",
      delete: 'Supprime définitivement une série de tâches et son historique.',
    },
    fields: {
      '--series-id': 'Référence stable de la tâche.',
      '--agent-group-id': "Groupe d'agent propriétaire de la tâche.",
      '--session-id': 'Session système qui exécute la tâche.',
      '--status': 'État courant.',
      '--process-after': "Prochaine exécution (ISO 8601 ou heure locale sans fuseau). Requis pour les tâches uniques ; avec --recurrence, la première exécution est déduite de la grille cron.",
      '--recurrence': 'Expression cron facultative.',
      '--prompt': 'Consigne de la tâche.',
      '--script': 'Script bash facultatif exécuté avant la tâche.',
    },
  },

  'user-dms': {
    description:
      "Cache des messages privés — associe (utilisateur, type de canal) au groupe de discussion utilisé pour la livraison en privé. Rempli à la demande par ensureUserDm() quand l'hôte doit écrire en privé à un utilisateur sans conversation existante (approbations, appairage). Pour les canaux adressables directement (Telegram, WhatsApp), l'identifiant EST celui de la conversation privée. Pour les canaux nécessitant une résolution (Discord, Slack), c'est le openDM de l'adaptateur qui la fournit.",
    verbs: {},
    fields: {
      '--user-id': 'Utilisateur concerné par cette route de message privé.',
      '--channel-type': "Type d'adaptateur de canal.",
      '--messaging-group-id': 'Groupe de discussion utilisé pour livrer les messages privés à cet utilisateur sur ce canal.',
      '--resolved-at': 'Date de la dernière résolution de cette route.',
    },
  },

  users: {
    description:
      "Utilisateur — une identité sur une plateforme de messagerie. Chaque ligne est un expéditeur sur un canal. Une même personne peut avoir plusieurs lignes réparties sur plusieurs canaux (pas encore de rapprochement entre canaux).",
    verbs: {},
    fields: {
      '--id': "Forme \"channel_type:handle\" — p. ex. \"tg:6037840640\", \"discord:123456789\", \"email:user@example.com\". Doit être fourni à la création.",
      '--kind': "Identifiant du type de canal (p. ex. \"telegram\", \"discord\"). Sert de repli pour résoudre les messages privés quand le préfixe de l'identifiant ne correspond à aucun adaptateur enregistré.",
      '--display-name': "Nom lisible. Affiché dans les cartes d'approbation et les journaux. Souvent renseigné automatiquement depuis l'adaptateur de canal.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },

  wirings: {
    description:
      "Câblage — relie un groupe de discussion à un groupe d'agent. Détermine quel agent traite les messages de quelle conversation. Un même groupe de discussion peut être câblé à plusieurs agents, et un même agent à plusieurs groupes de discussion.",
    verbs: {
      create:
        "Câble un groupe de discussion à un groupe d'agent. Identifier le groupe de discussion par --messaging-group-id OU --channel-type + --platform-id (+ --instance) ; identifier l'agent par --agent-group-id OU --agent-group <dossier>. Idempotent sur le couple (groupe de discussion, groupe d'agent). Options de déclenchement : --engage-mode, --engage-pattern, --session-mode, --sender-scope, --ignored-message-policy, --threads, --priority. Les options de déclenchement omises prennent la valeur déclarée par l'adaptateur de canal.",
    },
    fields: {
      '--id': 'UUID.',
      '--messaging-group-id': 'La conversation ou le canal de départ. Référence messaging_groups.id.',
      '--agent-group-id': "L'agent qui traite les messages. Référence agent_groups.id.",
      '--engage-mode':
        "Quand l'agent intervient. \"mention\" — seulement s'il est @mentionné, ou en message privé. \"mention-sticky\" — une fois mentionné dans un fil, l'agent s'y abonne et répond à tous les messages suivants de ce fil sans nouvelle mention. \"pattern\" — teste chaque message contre l'expression régulière engage_pattern. Par défaut : ce que déclare l'adaptateur de canal pour la conversation visée (message privé ou groupe) ; \"mention\" si le canal ne déclare rien.",
      '--engage-pattern': "Expression régulière pour engage_mode=pattern. Requise dans ce mode. Utiliser \".\" pour intercepter chaque message (toujours actif). Ignorée dans les modes à mention.",
      '--sender-scope': "\"all\" — n'importe quel expéditeur (sous réserve de unknown_sender_policy). \"known\" — seulement les utilisateurs ayant un rôle ou une adhésion dans ce groupe d'agent.",
      '--ignored-message-policy':
        "Ce qu'il advient des messages qui ne déclenchent pas l'agent. \"drop\" — l'agent ne les voit jamais. \"accumulate\" — conservés comme contexte de fond (trigger=0), pour que l'agent dispose de l'historique le jour où il est déclenché.",
      '--session-mode':
        "\"shared\" — une session par couple (agent, groupe de discussion). \"per-thread\" — une session distincte par fil ou sujet. \"agent-shared\" — une seule session pour tous les groupes de discussion câblés à cet agent. À noter : dans les conversations de groupe, les adaptateurs à fils imposent per-thread quel que soit ce réglage.",
      '--threads':
        "Réglage des fils propre à ce câblage : respecter les identifiants de fil de la plateforme (sessions par fil dans les groupes ; réponses, indicateur de saisie et cartes restent dans le fil). NULL = hériter du défaut du canal. Peut désactiver les fils sur une plateforme qui les gère, jamais les activer sur une plateforme qui ne les gère pas.",
      '--priority': "Ordre de diffusion quand plusieurs agents sont câblés au même groupe de discussion — priorité la plus haute d'abord.",
      '--created-at': 'Renseigné automatiquement.',
    },
  },
};
