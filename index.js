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

console.log("✅ BOT VERSION: Crafting Calculator v4-fixed");

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

  "Amortizor Pistol": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor Combat Pistol": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor Pistol MK2": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor CERAMIC PISTOL": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor Pistol XM3": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor MICRO SMG": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },
  "Amortizor TEC-9": { "Otel": 2, "Suruburi": 5, "Polimer": 2 },
  "Amortizor Muzzle Brake Tec Pistol": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },
  "Amortizor SMG": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },
  "Amortizor Assault Rifle": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },
  "Amortizor Carbine Rifle": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },
  "Amortizor Advanced Rifle": { "Otel": 3, "Suruburi": 5, "Polimer": 3 },

  "Incarcator Pistol": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Arc Metalic": 1 },
  "Incarcator Combat Pistol": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Arc Metalic": 1 },
  "Incarcator Pistol MK2": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Arc Metalic": 1 },
  "Incarcator CERAMIC PISTOL": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Arc Metalic": 1 },
  "Incarcator MICRO SMG": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Arc Metalic": 1 },
  "Incarcator TEC-9": { "Otel": 2, "Suruburi": 8, "Polimer": 2, "Arc Metalic": 1 },
  "Incarcator Tec Pistol": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Arc Metalic": 1 },
  "Incarcator SMG": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Arc Metalic": 1 },
  "Baterie de Gloante SMG": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Arc Metalic": 1 },
  "Incarcator Assault Rifle": { "Otel": 3, "Suruburi": 20, "Polimer": 3, "Arc Metalic": 1 },
  "Baterie de Gloante Assault Rifle": { "Otel": 2, "Suruburi": 5, "Polimer": 2, "Arc Metalic": 1 },
  "Incarcator Compact Rifle": { "Otel": 3, "Suruburi": 30, "Polimer": 3, "Arc Metalic": 1 },
  "Baterie de Gloante Compact Rifle": { "Otel": 3, "Suruburi": 20, "Polimer": 3, "Arc Metalic": 1 },
  "Baterie de Gloante Carabine Rifle": { "Otel": 3, "Suruburi": 20, "Polimer": 3, "Arc Metalic": 1 },
  "Incarcator Advanced Rifle": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Arc Metalic": 1 },

  "Lanterna Pistol": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna Combat pistol": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna Pistol MK2": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna MICRO SMG": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna SMG": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna Assault Rifle": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },
  "Lanterna Advanced Rifle": { "Otel": 1, "Suruburi": 5, "Polimer": 1, "Bec": 1, "Lupa": 1 },

  "Mounted Scope Pistol MK2": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Lupa": 1 },
  "Luneta MICRO SMG": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Lupa": 1 },
  "Luneta Tec Pistol": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Lupa": 1 },
  "Luneta SMG": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Lupa": 1 },
  "Luneta Assault Rifle": { "Otel": 2, "Suruburi": 10, "Polimer": 2, "Lupa": 1 },

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
  "Munitie Pistol": {"Praf de Pusca": 1 },
};

const GROUPS = {
  "Pistoale": ["Pistol", "Combat Pistol", "Pistol MK2", "Ceramic Pistol", "Pistol XM3"],
  "SMG-uri": ["Micro SMG", "TEC-9", "Mini SMG", "TEC-Pistol", "SMG"],
  "Arme mari": ["Combat PDW", "Assault Rifle", "Compact Rifle", "Carabine Rifle", "Advanced Rifle"],
  "Amortizoare": [
    "Amortizor Pistol",
    "Amortizor Combat Pistol",
    "Amortizor Pistol MK2",
    "Amortizor CERAMIC PISTOL",
    "Amortizor Pistol XM3",
    "Amortizor MICRO SMG",
    "Amortizor TEC-9",
    "Amortizor Muzzle Brake Tec Pistol",
    "Amortizor SMG",
    "Amortizor Assault Rifle",
    "Amortizor Carbine Rifle",
    "Amortizor Advanced Rifle"
  ],
  "Incarcatoare": [
    "Incarcator Pistol",
    "Incarcator Combat Pistol",
    "Incarcator Pistol MK2",
    "Incarcator CERAMIC PISTOL",
    "Incarcator MICRO SMG",
    "Incarcator TEC-9",
    "Incarcator Tec Pistol",
    "Incarcator SMG",
    "Baterie de Gloante SMG",
    "Incarcator Assault Rifle",
    "Baterie de Gloante Assault Rifle",
    "Incarcator Compact Rifle",
    "Baterie de Gloante Compact Rifle",
    "Baterie de Gloante Carabine Rifle",
    "Incarcator Advanced Rifle"
  ],
  "Lanterne": [
    "Lanterna Pistol",
    "Lanterna Combat pistol",
    "Lanterna Pistol MK2",
    "Lanterna MICRO SMG",
    "Lanterna SMG",
    "Lanterna Assault Rifle",
    "Lanterna Advanced Rifle"
  ],
  "Scope": [
    "Mounted Scope Pistol MK2",
    "Luneta MICRO SMG",
    "Luneta Tec Pistol",
    "Luneta SMG",
    "Luneta Assault Rifle"
  ],
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
  ],
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const carts = new Map();
const pendingItem = new Map();
const selectedGroup = new Map();

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
      "Ai nevoie de arme?\nDeschide calculatorul si vezi cate materiale iti trebuie.",
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
  const currentGroup = selectedGroup.get(userId) || "Pistoale";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_group_pistoale")
      .setLabel("Pistoale")
      .setStyle(currentGroup === "Pistoale" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_smg")
      .setLabel("SMG-uri")
      .setStyle(currentGroup === "SMG-uri" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_arme_mari")
      .setLabel("Arme mari")
      .setStyle(currentGroup === "Arme mari" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_amortizoare")
      .setLabel("Amortizoare")
      .setStyle(currentGroup === "Amortizoare" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_incarcatoare")
      .setLabel("Incarcatoare")
      .setStyle(currentGroup === "Incarcatoare" ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildGroupButtons2(userId) {
  const currentGroup = selectedGroup.get(userId) || "Pistoale";

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_group_lanterne")
      .setLabel("Lanterne")
      .setStyle(currentGroup === "Lanterne" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_scope")
      .setLabel("Scope")
      .setStyle(currentGroup === "Scope" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_grip")
      .setLabel("Grip")
      .setStyle(currentGroup === "Grip" ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("calc_group_gloante")
      .setLabel("Gloante")
      .setStyle(currentGroup === "Gloante" ? ButtonStyle.Primary : ButtonStyle.Secondary)
  );
}

function buildItemSelect(userId) {
  const currentGroup = selectedGroup.get(userId) || "Pistoale";
  const items = GROUPS[currentGroup] || [];

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("calc_select_item")
      .setPlaceholder("Alege arma/atasamentul/gloantele")
      .addOptions(
        items.map((itemName) => ({
          label: itemName.slice(0, 100),
          value: itemName,
          description: `Selectează ${itemName}`.slice(0, 100),
        }))
      )
  );
}

function buildQtySelect() {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("calc_select_qty")
      .setPlaceholder("Alege cantitatea...")
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
  const currentGroup = selectedGroup.get(userId) || "Pistoale";
  const selected = pendingItem.get(userId);

  let helperText = "";
  if (selected) {
    helperText = `**Item selectat:** ${selected}\nAlege cantitatea pentru acest item.\n\n`;
  }

  const content =
    `${notice ? `**${notice}**\n\n` : ""}` +
    `**Grupa curentă:** ${currentGroup}\n\n` +
    `**Coșul tău:**\n${formatCart(userId)}\n\n` +
    helperText +
    `1. Alege grupa\n` +
    `2. Alege arma/atasamentul/gloantele\n` +
    `3. Alege cantitatea\n` +
    `4. Repetă pentru alte arme/atasamente/gloante\n` +
    `5. **Calculează**`;

  const components = [
    buildGroupButtons(userId),
    buildGroupButtons2(userId),
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
function buildConsumableQtyModal(itemName) {
  return new ModalBuilder()
    .setCustomId("calc_consumable_qty_modal")
    .setTitle(`Cantitate pentru ${itemName}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("qty_input")
          .setLabel("Introdu cantitatea")
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

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isModalSubmit() && interaction.customId === "calc_consumable_qty_modal") {
      const itemName = pendingItem.get(interaction.user.id);

      if (!itemName || !RECIPES[itemName]) {
        return interaction.reply({
          content: "❌ Nu am găsit itemul selectat. Încearcă din nou.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const rawQty = interaction.fields.getTextInputValue("qty_input").trim();
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

      return interaction.reply({
        ...buildCalculatorUI(interaction.user.id, `Adăugat în coș: ${itemName} x${qty}`),
        flags: MessageFlags.Ephemeral,
      });
    }
    
    if (interaction.isChatInputCommand() && interaction.commandName === "setup-calculator") {
      await interaction.channel.send(buildOpenPanel());

      return interaction.reply({
        content: "✅ Panoul calculatorului a fost postat în acest canal.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isButton() && interaction.customId === "calc_open") {
      if (!selectedGroup.has(interaction.user.id)) {
        selectedGroup.set(interaction.user.id, "Pistoale");
      }

      pendingItem.delete(interaction.user.id);

      return interaction.reply({
        ...buildCalculatorUI(interaction.user.id),
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.isButton() && interaction.customId === "calc_group_pistoale") {
      selectedGroup.set(interaction.user.id, "Pistoale");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_smg") {
      selectedGroup.set(interaction.user.id, "SMG-uri");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_arme_mari") {
      selectedGroup.set(interaction.user.id, "Arme mari");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_amortizoare") {
      selectedGroup.set(interaction.user.id, "Amortizoare");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_incarcatoare") {
      selectedGroup.set(interaction.user.id, "Incarcatoare");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_lanterne") {
      selectedGroup.set(interaction.user.id, "Lanterne");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_scope") {
      selectedGroup.set(interaction.user.id, "Scope");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }

    if (interaction.isButton() && interaction.customId === "calc_group_grip") {
      selectedGroup.set(interaction.user.id, "Grip");
      pendingItem.delete(interaction.user.id);
      return interaction.update(buildCalculatorUI(interaction.user.id));
    }
    
    if (interaction.isButton() && interaction.customId === "calc_group_gloante") {
  selectedGroup.set(interaction.user.id, "Gloante");
  pendingItem.delete(interaction.user.id);
  return interaction.update(buildCalculatorUI(interaction.user.id));
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

      const currentGroup = selectedGroup.get(interaction.user.id) || "Pistoale";

      // For Consumabile -> open typed quantity modal
      if (currentGroup === "Consumabile") {
        return interaction.showModal(buildConsumableQtyModal(itemName));
      }

      // For all other groups -> keep dropdown quantity
      return interaction.update(
        buildCalculatorUI(interaction.user.id, `Ai selectat ${itemName}.`)
      );
    }

      pendingItem.set(interaction.user.id, itemName);

      return interaction.update(
        buildCalculatorUI(interaction.user.id, `Ai selectat ${itemName}.`)
      );
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "calc_select_qty") {
      const itemName = pendingItem.get(interaction.user.id);

      if (!itemName || !RECIPES[itemName]) {
        return interaction.update(
          buildCalculatorUI(interaction.user.id, "Mai întâi selectează un item.")
        );
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

      return interaction.update(
        buildCalculatorUI(interaction.user.id, `Adăugat în coș: ${itemName} x${qty}`)
      );
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
