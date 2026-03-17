require("dotenv").config();

const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
  MessageFlags,
} = require("discord.js");

console.log("✅ BOT VERSION: Crafting Calculator v5");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`❌ Missing environment variable: ${name}`);
    process.exit(1);
  }
  return v;
}

const TOKEN = mustEnv("TOKEN");
const CLIENT_ID = mustEnv("CLIENT_ID");
const GUILD_ID = mustEnv("GUILD_ID");

const RECIPES = {
  "Pistol": { "Otel": 8, "Suruburi": 80, "Arc Metalic": 1, "Polimer": 20 },
  "Combat Pistol": { "Otel": 8, "Suruburi": 85, "Polimer": 18 },
  "Pistol MK2": { "Otel": 9, "Suruburi": 91, "Arc Metalic": 1, "Polimer": 22 },
  "Ceramic Pistol": { "Otel": 9, "Suruburi": 91, "Arc Metalic": 1, "Polimer": 18 },
  "Pistol XM3": { "Otel": 10, "Suruburi": 95, "Arc Metalic": 1, "Polimer": 20 },

  "Micro SMG": { "Otel": 15, "Suruburi": 95, "Arc Metalic": 1, "Polimer": 42, "Teava Metalica": 1 },
  "TEC-9": { "Otel": 12, "Suruburi": 100, "Arc Metalic": 1, "Polimer": 38 },
  "Mini SMG": { "Otel": 11, "Suruburi": 97, "Arc Metalic": 1, "Polimer": 36, "Bucata de Lemn": 1 },
  "TEC-Pistol": { "Otel": 14, "Suruburi": 115, "Arc Metalic": 1, "Polimer": 44, "Teava Metalica": 1 },
  "SMG": { "Otel": 13, "Suruburi": 105, "Arc Metalic": 1, "Polimer": 48, "Teava Metalica": 1 },

  "Combat PDW": { "Otel": 14, "Suruburi": 110, "Arc Metalic": 1, "Polimer": 50, "Teava Metalica": 1 },
  "Assault Rifle": { "Otel": 21, "Suruburi": 135, "Arc Metalic": 2, "Polimer": 68, "Bucata de Lemn": 1, "Teava Metalica": 1 },
  "Compact Rifle": { "Otel": 19, "Suruburi": 115, "Arc Metalic": 2, "Polimer": 44, "Bucata de Lemn": 1, "Teava Metalica": 1 },
  "Carabine Rifle": { "Otel": 18, "Suruburi": 140, "Arc Metalic": 2, "Polimer": 72, "Teava Metalica": 1 },
  "Advanced Rifle": { "Otel": 18, "Suruburi": 145, "Arc Metalic": 2, "Polimer": 78, "Teava Metalica": 1 },

  "Grip Assault Rifle": { "Otel": 1, "Suruburi": 5, "Polimer": 1 },

  "Munitie DB": { "Praf de Pusca": 5 },
  "Munitie Gusenberg": { "Praf de Pusca": 1.8 },
  "Munitie Advance Rifle": { "Praf de Pusca": 3 },
  "Munitie Carabine Rifle": { "Praf de Pusca": 3 },
  "Munitie Compact Rifle": { "Praf de Pusca": 2.5 },
  "Munitie Assault Rifle": { "Praf de Pusca": 2.5 },
  "Munitie Combat PDW": { "Praf de Pusca": 1.8 },
  "Munitie SMG": { "Praf de Pusca": 1.8 },
  "Munitie Tec Pistol": { "Praf de Pusca": 1.8 },
  "Munitie Mini-SMG": { "Praf de Pusca": 1.5 },
  "Munitie Micro SMG": { "Praf de Pusca": 1.5 },
  "Munitie Tec-9": { "Praf de Pusca": 1.5 },
  "Munitie Pistol XM3": { "Praf de Pusca": 1.3 },
  "Munitie Ceramic Pistol": { "Praf de Pusca": 1.3 },
  "Munitie Pistol MK2": { "Praf de Pusca": 1.3 },
  "Munitie Combat Pistol": { "Praf de Pusca": 1 },
  "Munitie Pistol": { "Praf de Pusca": 1 },
};

const GROUPS = {
  "Pistoale": ["Pistol", "Combat Pistol", "Pistol MK2", "Ceramic Pistol", "Pistol XM3"],
  "SMG-uri": ["Micro SMG", "TEC-9", "Mini SMG", "TEC-Pistol", "SMG"],
  "Arme mari": ["Combat PDW", "Assault Rifle", "Compact Rifle", "Carabine Rifle", "Advanced Rifle"],
  "Grip": ["Grip Assault Rifle"],
  "Gloante": [
    "Munitie DB",
    "Munitie Gusenberg",
    "Munitie Advance Rifle",
    "Munitie Carabine Rifle",
    "Munitie Compact Rifle",
    "Munitie Assault Rifle",
    "Munitie Combat PDW",
    "Munitie SMG",
    "Munitie Tec Pistol",
    "Munitie Mini-SMG",
    "Munitie Micro SMG",
    "Munitie Tec-9",
    "Munitie Pistol XM3",
    "Munitie Ceramic Pistol",
    "Munitie Pistol MK2",
    "Munitie Combat Pistol",
    "Munitie Pistol"
  ]
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const carts = new Map();
const pendingItem = new Map();
const selectedGroup = new Map();

function calculateTotals(cart) {
  const totals = new Map();

  for (const entry of cart) {
    const recipe = RECIPES[entry.itemName];
    if (!recipe) continue;

    for (const [material, amountPerUnit] of Object.entries(recipe)) {
      const current = totals.get(material) || 0;
      totals.set(material, current + amountPerUnit * entry.qty);
    }
  }

  return Array.from(totals.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], "ro")
  );
}

function buildConsumableQtyModal(itemName) {
  return new ModalBuilder()
    .setCustomId("calc_gloante_qty_modal")
    .setTitle(`Cantitate pentru ${itemName}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("qty_input")
          .setLabel("Introdu cantitatea exactă")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: 250")
          .setRequired(true)
      )
    );
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("setup-calculator")
      .setDescription("Postează panoul public al calculatorului.")
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered.");
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {

    if (interaction.isModalSubmit() && interaction.customId === "calc_gloante_qty_modal") {

      const itemName = pendingItem.get(interaction.user.id);

      const qty = Number(
        interaction.fields.getTextInputValue("qty_input").trim()
      );

      if (!Number.isInteger(qty) || qty <= 0) {
        return interaction.reply({
          content: "❌ Cantitatea trebuie să fie un număr întreg.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const cart = carts.get(interaction.user.id) || [];
      const existing = cart.find(x => x.itemName === itemName);

      if (existing) existing.qty += qty;
      else cart.push({ itemName, qty });

      carts.set(interaction.user.id, cart);
      pendingItem.delete(interaction.user.id);

      return interaction.reply({
        content: `✅ Adăugat: **${itemName} x${qty}**`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "setup-calculator") {

      await interaction.channel.send({
        content: "Ai nevoie de arme?\nDeschide calculatorul.",
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("calc_open")
              .setLabel("Deschide Calculatorul")
              .setStyle(ButtonStyle.Primary)
          )
        ]
      });

      return interaction.reply({
        content: "✅ Panou postat.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isButton() && interaction.customId === "calc_open") {

      selectedGroup.set(interaction.user.id, "Pistoale");

      return interaction.reply({
        content: "Selectează grupa.",
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "calc_select_item") {

      const itemName = interaction.values[0];

      const currentGroup = selectedGroup.get(interaction.user.id);

      pendingItem.set(interaction.user.id, itemName);

      if (currentGroup === "Gloante") {
        return interaction.showModal(buildConsumableQtyModal(itemName));
      }

      return interaction.reply({
        content: `Ai selectat ${itemName}`,
        flags: MessageFlags.Ephemeral
      });
    }

  } catch (err) {

    console.error("❌ Interaction error:", err);

    try {

      if (interaction.isRepliable()) {

        await interaction.reply({
          content: "❌ A apărut o eroare.",
          flags: MessageFlags.Ephemeral,
        });

      }

    } catch {}

  }
});

client.login(TOKEN);
