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
  Events,
  MessageFlags,
} = require("discord.js");

console.log("✅ BOT VERSION: Crafting Calculator v3");

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
// =========================
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
};

const GROUPS = {
  "Pistoale": ["Pistol", "Combat Pistol", "Pistol MK2", "Ceramic Pistol", "Pistol XM3"],
  "SMG-uri": ["Micro SMG", "TEC-9", "Mini SMG", "TEC-Pistol", "SMG"],
  "Arme mari": ["Combat PDW", "Assault Rifle", "Compact Rifle", "Carabine Rifle", "Advanced Rifle"],
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
const carts = new Map();        // userId -> [{ itemName, qty }]
const pendingItem = new Map();  // userId -> selected item name
const selectedGroup = new Map();// userId -> "1" | "2" | "3"

// =========================
// HELPERS
// =========================
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
  return {
    content:
      "**Calculator Crafting**\nApasă pe buton pentru a deschide calculatorul.\nSelecția și calculele tale vor fi private.",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("calc_open")
          .setLabel("Deschide Calculatorul")
          .setStyle(ButtonStyle.Primary)
      ),
    ],
  };
}

function buildGroupButtons(userId) {
  const currentGroup = selectedGroup.get(userId) || "1";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_group_1")
      .setLabel("Pistoale")
      .setStyle(currentGroup === "Pistoale" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_2")
      .setLabel("SMG-uri")
      .setStyle(currentGroup === "SMG-uri" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_3")
      .setLabel("Arme mari")
      .setStyle(currentGroup === "Arme mari" ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildItemSelect(userId) {
  const currentGroup = selectedGroup.get(userId) || "1";
  const items = GROUPS[currentGroup] || [];

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("calc_select_item")
      .setPlaceholder("Alege o arma...")
      .addOptions(
        items.map((itemName) => ({
          label: itemName,
          value: itemName,
          description: `Selectează ${itemName}`,
        }))
      )
  );
}

function buildQtySelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("calc_select_qty")
      .setPlaceholder("Cate arme vrei?")
      .addOptions(
        Array.from({ length: 20 }, (_, i) => ({
          label: `${i + 1}`,
          value: `${i + 1}`,
          description: `Cantitate ${i + 1}`,
        }))
      )
  );
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
  const selected = pendingItem.get(userId);

  let helperText = "";
  if (selected) {
    helperText = `**Item selectat:** ${selected}\nAlege cantitatea pentru acest item.\n\n`;
  }

  const content =
    `${notice ? `**${notice}**\n\n` : ""}` +
    `**Calculator privat**\n` +
    `**Grupa curentă:** ${currentGroup}\n\n` +
    `**Coșul tău:**\n${formatCart(userId)}\n\n` +
    helperText +
    `1. Alege tipul de arma\n` +
    `2. Alege arma\n` +
    `3. Alege cantitatea\n` +
    `4. Repetă pentru alte arme\n` +
    `5. **Calculează**`;

  const components = [
    buildGroupButtons(userId),
    buildItemSelect(userId),
  ];

  if (selected) {
    components.push(buildQtySelect());
  }

  components.push(buildActionButtons(userId));

  return { content, components };
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
    if (interaction.isChatInputCommand() && interaction.commandName === "setup-calculator") {
      await interaction.channel.send(buildOpenPanel());

      return interaction.reply({
        content: "✅ Panoul calculatorului a fost postat în acest canal.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isButton() && interaction.customId === "calc_open") {
      if (!selectedGroup.has(interaction.user.id)) {
        selectedGroup.set(interaction.user.id, "1");
      }

      pendingItem.delete(interaction.user.id);

      const ui = buildCalculatorUI(interaction.user.id);

      return interaction.reply({
        ...ui,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isButton() && interaction.customId.startsWith("calc_group_")) {
      const groupId = interaction.customId.replace("calc_group_", "");
      selectedGroup.set(interaction.user.id, groupId);
      pendingItem.delete(interaction.user.id);

      const ui = buildCalculatorUI(interaction.user.id);

      return interaction.update(ui);
    }

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

    if (interaction.isStringSelectMenu() && interaction.customId === "calc_select_item") {
      const itemName = interaction.values[0];

      if (!RECIPES[itemName]) {
        return interaction.reply({
          content: "❌ Item invalid.",
          flags: MessageFlags.Ephemeral,
        });
      }

      pendingItem.set(interaction.user.id, itemName);

      const ui = buildCalculatorUI(interaction.user.id, `Ai selectat ${itemName}.`);

      return interaction.update(ui);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "calc_select_qty") {
      const itemName = pendingItem.get(interaction.user.id);

      if (!itemName || !RECIPES[itemName]) {
        const ui = buildCalculatorUI(interaction.user.id, "Mai întâi selectează un item.");
        return interaction.update(ui);
      }

      const qty = Number(interaction.values[0]);
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

      return interaction.update(ui);
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
