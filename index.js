require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Events,
  MessageFlags,
} = require("discord.js");

console.log("✅ BOT VERSION: Crafting Calculator v2");

// =========================
// ENV
// =========================
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

// =========================
// STATIC RECIPES
// Rename items later in GitHub if you want
// =========================
const RECIPES = {
  "Item 1": {
    "Otel": 8,
    "Suruburi": 80,
    "Arc Metalic": 1,
    "Polimer": 20,
  },

  "Item 2": {
    "Otel": 8,
    "Suruburi": 85,
    "Polimer": 18,
  },

  "Item 3": {
    "Otel": 9,
    "Suruburi": 91,
    "Arc Metalic": 1,
    "Polimer": 22,
  },

  "Item 4": {
    "Otel": 9,
    "Suruburi": 91,
    "Arc Metalic": 1,
    "Polimer": 18,
  },

  "Item 5": {
    "Otel": 10,
    "Suruburi": 95,
    "Arc Metalic": 1,
    "Polimer": 20,
  },

  "Item 6": {
    "Otel": 15,
    "Suruburi": 95,
    "Arc Metalic": 1,
    "Polimer": 42,
    "Teava Metalica": 1,
  },

  "Item 7": {
    "Otel": 12,
    "Suruburi": 100,
    "Arc Metalic": 1,
    "Polimer": 38,
  },

  "Item 8": {
    "Otel": 11,
    "Suruburi": 97,
    "Arc Metalic": 1,
    "Polimer": 36,
    "Bucata de Lemn": 1,
  },

  "Item 9": {
    "Otel": 14,
    "Suruburi": 115,
    "Arc Metalic": 1,
    "Polimer": 44,
    "Teava Metalica": 1,
  },

  "Item 10": {
    "Otel": 13,
    "Suruburi": 105,
    "Arc Metalic": 1,
    "Polimer": 48,
    "Teava Metalica": 1,
  },

  "Item 11": {
    "Otel": 14,
    "Suruburi": 110,
    "Arc Metalic": 1,
    "Polimer": 50,
    "Teava Metalica": 1,
  },

  "Item 12": {
    "Otel": 21,
    "Suruburi": 135,
    "Arc Metalic": 2,
    "Polimer": 68,
    "Bucata de Lemn": 1,
    "Teava Metalica": 1,
  },

  "Item 13": {
    "Otel": 19,
    "Suruburi": 115,
    "Arc Metalic": 2,
    "Polimer": 44,
    "Bucata de Lemn": 1,
    "Teava Metalica": 1,
  },

  "Item 14": {
    "Otel": 18,
    "Suruburi": 140,
    "Arc Metalic": 2,
    "Polimer": 72,
    "Teava Metalica": 1,
  },

  "Item 15": {
    "Otel": 18,
    "Suruburi": 145,
    "Arc Metalic": 2,
    "Polimer": 78,
    "Teava Metalica": 1,
  },
};

const GROUPS = {
  "1": ["Item 1", "Item 2", "Item 3", "Item 4", "Item 5"],
  "2": ["Item 6", "Item 7", "Item 8", "Item 9", "Item 10"],
  "3": ["Item 11", "Item 12", "Item 13", "Item 14", "Item 15"],
};

// =========================
// DISCORD CLIENT
// =========================
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// =========================
// IN-MEMORY USER STATE
// =========================
// userId -> [{ itemName, qty }]
const carts = new Map();

// userId -> selected item waiting for quantity
const pendingItem = new Map();

// userId -> current group page
const selectedGroup = new Map();

// =========================
// HELPERS
// =========================
function getAllItems() {
  return Object.keys(RECIPES);
}

function formatCart(userId) {
  const cart = carts.get(userId) || [];
  if (cart.length === 0) return "Coșul este gol.";

  return cart
    .map((entry, index) => `${index + 1}. **${entry.itemName}** x${entry.qty}`)
    .join("\n");
}

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

  return Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0], "ro"));
}

function buildOpenPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_open")
      .setLabel("Deschide Calculatorul")
      .setStyle(ButtonStyle.Primary)
  );

  return {
    content:
      "**Calculator Crafting**\nApasă pe buton pentru a deschide calculatorul.\nSelecția și calculele tale vor fi private.",
    components: [row],
  };
}

function buildGroupButtons(userId) {
  const currentGroup = selectedGroup.get(userId) || "1";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_group_1")
      .setLabel("Grupa 1")
      .setStyle(currentGroup === "1" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_2")
      .setLabel("Grupa 2")
      .setStyle(currentGroup === "2" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_3")
      .setLabel("Grupa 3")
      .setStyle(currentGroup === "3" ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildItemSelect(userId) {
  const currentGroup = selectedGroup.get(userId) || "1";
  const items = GROUPS[currentGroup] || [];

  const menu = new StringSelectMenuBuilder()
    .setCustomId("calc_select_item")
    .setPlaceholder("Alege un item...")
    .addOptions(
      items.map((itemName) => ({
        label: itemName,
        value: itemName,
        description: `Adaugă ${itemName} în coș`,
      }))
    );

  return new ActionRowBuilder().addComponents(menu);
}

function buildActionButtons(userId) {
  const cart = carts.get(userId) || [];

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_finish")
      .setLabel("Calculează")
      .setStyle(ButtonStyle.Success)
      .setDisabled(cart.length === 0),
    new ButtonBuilder()
      .setCustomId("calc_clear")
      .setLabel("Golește coșul")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(cart.length === 0)
  );
}

function buildCalculatorUI(userId, notice = "") {
  const currentGroup = selectedGroup.get(userId) || "1";

  const content =
    `${notice ? `**${notice}**\n\n` : ""}` +
    `**Calculator privat**\n` +
    `**Grupa curentă:** ${currentGroup}\n\n` +
    `**Coșul tău:**\n${formatCart(userId)}\n\n` +
    `1. Alege grupa\n` +
    `2. Alege itemul\n` +
    `3. Introdu cantitatea\n` +
    `4. Repetă pentru alte iteme\n` +
    `5. Apasă **Calculează**`;

  return {
    content,
    components: [
      buildGroupButtons(userId),
      buildItemSelect(userId),
      buildActionButtons(userId),
    ],
  };
}

function buildResultMessage(userId) {
  const cart = carts.get(userId) || [];
  const totals = calculateTotals(cart);

  const totalsText =
    totals.length > 0
      ? totals.map(([name, qty]) => `• **${name}**: ${qty}`).join("\n")
      : "Nu există materiale de calculat.";

  return {
    content:
      `**Rezultat calcul privat**\n\n` +
      `**Coșul tău:**\n${formatCart(userId)}\n\n` +
      `**Materiale totale necesare:**\n${totalsText}`,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("calc_open")
          .setLabel("Înapoi la calculator")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("calc_clear")
          .setLabel("Golește coșul")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled((carts.get(userId) || []).length === 0)
      ),
    ],
  };
}

function buildQtyModal(itemName) {
  return new ModalBuilder()
    .setCustomId("calc_qty_modal")
    .setTitle(`Cantitate pentru ${itemName}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("qty")
          .setLabel("Introdu cantitatea")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Ex: 3")
          .setRequired(true)
      )
    );
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("setup-calculator")
      .setDescription("Postează panoul public al calculatorului în canalul curent.")
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered.");
}

// =========================
// READY
// =========================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerCommands();
});

// =========================
// INTERACTIONS
// =========================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Slash command: post public panel
    if (interaction.isChatInputCommand() && interaction.commandName === "setup-calculator") {
      await interaction.channel.send(buildOpenPanel());

      return interaction.reply({
        content: "✅ Panoul calculatorului a fost postat în acest canal.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Public/open button
    if (interaction.isButton() && interaction.customId === "calc_open") {
      if (!selectedGroup.has(interaction.user.id)) {
        selectedGroup.set(interaction.user.id, "1");
      }

      const ui = buildCalculatorUI(interaction.user.id);

      return interaction.reply({
        ...ui,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Group buttons
    if (interaction.isButton() && interaction.customId.startsWith("calc_group_")) {
      const groupId = interaction.customId.replace("calc_group_", "");
      selectedGroup.set(interaction.user.id, groupId);

      const ui = buildCalculatorUI(interaction.user.id);

      return interaction.update(ui);
    }

    // Clear cart
    if (interaction.isButton() && interaction.customId === "calc_clear") {
      carts.delete(interaction.user.id);
      pendingItem.delete(interaction.user.id);

      const ui = buildCalculatorUI(interaction.user.id, "Coșul a fost golit.");

      if (interaction.message.flags?.has?.(MessageFlags.Ephemeral)) {
        return interaction.update(ui);
      }

      return interaction.reply({
        ...ui,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Finish / calculate
    if (interaction.isButton() && interaction.customId === "calc_finish") {
      const cart = carts.get(interaction.user.id) || [];

      if (cart.length === 0) {
        return interaction.reply({
          content: "❌ Coșul tău este gol.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const result = buildResultMessage(interaction.user.id);

      if (interaction.message.flags?.has?.(MessageFlags.Ephemeral)) {
        return interaction.update(result);
      }

      return interaction.reply({
        ...result,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Item select
    if (interaction.isStringSelectMenu() && interaction.customId === "calc_select_item") {
      const itemName = interaction.values[0];

      if (!RECIPES[itemName]) {
        return interaction.reply({
          content: "❌ Item invalid.",
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingItem.set(interaction.user.id, itemName);

      return interaction.showModal(buildQtyModal(itemName));
    }

    // Quantity modal
    if (interaction.isModalSubmit() && interaction.customId === "calc_qty_modal") {
      const itemName = pendingItem.get(interaction.user.id);

      if (!itemName || !RECIPES[itemName]) {
        return interaction.reply({
          content: "❌ Nu am găsit itemul selectat. Încearcă din nou.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const rawQty = interaction.fields.getTextInputValue("qty").trim();
      const qty = Number(rawQty);

      if (!Number.isInteger(qty) || qty <= 0) {
        return interaction.reply({
          content: "❌ Cantitatea trebuie să fie un număr întreg mai mare decât 0.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const cart = carts.get(interaction.user.id) || [];
      const existing = cart.find((x) => x.itemName === itemName);

      if (existing) {
        existing.qty += qty;
      } else {
        cart.push({ itemName, qty });
      }

      carts.set(interaction.user.id, cart);
      pendingItem.delete(interaction.user.id);

      const ui = buildCalculatorUI(
        interaction.user.id,
        `Adăugat în coș: ${itemName} x${qty}`
      );

      return interaction.reply({
        ...ui,
        flags: MessageFlags.Ephemeral,
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
