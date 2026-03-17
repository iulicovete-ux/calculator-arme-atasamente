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
const { Pool } = require("pg");

console.log("✅ BOT VERSION: Crafting Calculator v1");

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
const DATABASE_URL = mustEnv("DATABASE_URL");

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const pool = new Pool({
  connectionString: DATABASE_URL,
});

// userId -> [{ itemId, itemName, qty }]
const carts = new Map();
// userId -> { itemId, itemName }
const pendingItem = new Map();

async function dbInit() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS craft_items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS materials (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipes (
      item_id INT NOT NULL REFERENCES craft_items(id) ON DELETE CASCADE,
      material_id INT NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
      amount INT NOT NULL CHECK (amount > 0),
      PRIMARY KEY (item_id, material_id)
    );
  `);
}

async function ensureItem(name) {
  const result = await pool.query(
    `
    INSERT INTO craft_items(name)
    VALUES ($1)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
    `,
    [name.trim()]
  );
  return result.rows[0];
}

async function ensureMaterial(name) {
  const result = await pool.query(
    `
    INSERT INTO materials(name)
    VALUES ($1)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
    `,
    [name.trim()]
  );
  return result.rows[0];
}

async function addRecipe(itemName, materialName, amount) {
  const item = await ensureItem(itemName);
  const material = await ensureMaterial(materialName);

  await pool.query(
    `
    INSERT INTO recipes(item_id, material_id, amount)
    VALUES ($1, $2, $3)
    ON CONFLICT (item_id, material_id)
    DO UPDATE SET amount = EXCLUDED.amount
    `,
    [item.id, material.id, amount]
  );
}

async function getItems() {
  const result = await pool.query(
    `SELECT id, name FROM craft_items ORDER BY name ASC`
  );
  return result.rows;
}

async function getRecipeForItem(itemId) {
  const result = await pool.query(
    `
    SELECT m.name AS material_name, r.amount
    FROM recipes r
    JOIN materials m ON m.id = r.material_id
    WHERE r.item_id = $1
    ORDER BY m.name ASC
    `,
    [itemId]
  );
  return result.rows;
}

async function seedDemoData() {
  const demo = [
    {
      item: "Item 1",
      recipe: {
        "Material A": 8,
        "Material B": 80,
        "Material C": 1,
      },
    },
    {
      item: "Item 2",
      recipe: {
        "Material A": 10,
        "Material B": 95,
        "Material D": 20,
      },
    },
    {
      item: "Item 3",
      recipe: {
        "Material A": 15,
        "Material C": 2,
        "Material E": 12,
      },
    },
  ];

  for (const entry of demo) {
    for (const [mat, qty] of Object.entries(entry.recipe)) {
      await addRecipe(entry.item, mat, qty);
    }
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("setup-calculator")
      .setDescription("Postează panoul public al calculatorului în canalul curent.")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("seed-demo-data")
      .setDescription("Adaugă câteva iteme demo în baza de date.")
      .toJSON(),

    new SlashCommandBuilder()
      .setName("add-item")
      .setDescription("Adaugă un item nou în baza de date.")
      .addStringOption((option) =>
        option
          .setName("nume")
          .setDescription("Numele itemului")
          .setRequired(true)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("add-recipe")
      .setDescription("Adaugă sau actualizează o rețetă pentru un item.")
      .addStringOption((option) =>
        option
          .setName("item")
          .setDescription("Numele itemului")
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("material")
          .setDescription("Numele materialului")
          .setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("cantitate")
          .setDescription("Cantitatea materialului pentru 1 item")
          .setRequired(true)
          .setMinValue(1)
      )
      .toJSON(),

    new SlashCommandBuilder()
      .setName("list-items")
      .setDescription("Afișează itemele disponibile în calculator.")
      .toJSON(),
  ];

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("✅ Slash commands registered.");
}

function buildOpenPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_open")
      .setLabel("Deschide Calculatorul")
      .setStyle(ButtonStyle.Primary)
  );

  return {
    content: "**Calculator Crafting**\nApasă pe buton pentru a deschide calculatorul.",
    components: [row],
  };
}

function formatCart(cart) {
  if (!cart || cart.length === 0) return "Coșul este gol.";
  return cart
    .map((entry, idx) => `${idx + 1}. **${entry.itemName}** x${entry.qty}`)
    .join("\n");
}

async function buildCalculatorUI(userId) {
  const items = await getItems();
  const cart = carts.get(userId) || [];

  if (items.length === 0) {
    return {
      content:
        "Nu există iteme în calculator încă.\nFolosește `/seed-demo-data` pentru test sau `/add-item` + `/add-recipe`.",
      components: [],
    };
  }

  const itemSelect = new StringSelectMenuBuilder()
    .setCustomId("calc_select_item")
    .setPlaceholder("Alege un item…")
    .addOptions(
      items.slice(0, 25).map((item) => ({
        label: item.name,
        value: String(item.id),
        description: `Adaugă ${item.name} în coș`,
      }))
    );

  const qtySelect = new StringSelectMenuBuilder()
    .setCustomId("calc_select_qty")
    .setPlaceholder("Alege cantitatea pentru itemul selectat…")
    .addOptions(
      Array.from({ length: 20 }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
        description: `Cantitate ${i + 1}`,
      }))
    );

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("calc_finish")
      .setLabel("Calculează")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("calc_clear")
      .setLabel("Golește coșul")
      .setStyle(ButtonStyle.Secondary)
  );

  return {
    content:
      `**Calculator privat**\n\n` +
      `**Coșul tău:**\n${formatCart(cart)}\n\n` +
      `1. Alege itemul\n` +
      `2. Alege cantitatea\n` +
      `3. Repetă pentru alte iteme\n` +
      `4. Apasă **Calculează**`,
    components: [
      new ActionRowBuilder().addComponents(itemSelect),
      new ActionRowBuilder().addComponents(qtySelect),
      buttons,
    ],
  };
}

async function calculateTotals(cart) {
  const totals = new Map();

  for (const entry of cart) {
    const recipe = await getRecipeForItem(entry.itemId);

    for (const row of recipe) {
      const current = totals.get(row.material_name) || 0;
      totals.set(row.material_name, current + row.amount * entry.qty);
    }
  }

  return Array.from(totals.entries()).sort((a, b) => a[0].localeCompare(b[0], "ro"));
}

client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  await dbInit();
  await registerCommands();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "setup-calculator") {
        await interaction.channel.send(buildOpenPanel());
        return interaction.reply({
          content: "✅ Panoul calculatorului a fost postat în acest canal.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.commandName === "seed-demo-data") {
        await seedDemoData();
        return interaction.reply({
          content: "✅ Datele demo au fost adăugate.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.commandName === "add-item") {
        const name = interaction.options.getString("nume", true);
        await ensureItem(name);
        return interaction.reply({
          content: `✅ Item adăugat: **${name}**`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.commandName === "add-recipe") {
        const item = interaction.options.getString("item", true);
        const material = interaction.options.getString("material", true);
        const qty = interaction.options.getInteger("cantitate", true);

        await addRecipe(item, material, qty);

        return interaction.reply({
          content: `✅ Rețetă salvată: **${item}** → **${material}** x${qty}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.commandName === "list-items") {
        const items = await getItems();
        return interaction.reply({
          content:
            items.length > 0
              ? items.map((x, i) => `${i + 1}. ${x.name}`).join("\n")
              : "Nu există iteme în baza de date.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "calc_open") {
        const ui = await buildCalculatorUI(interaction.user.id);
        return interaction.reply({
          ...ui,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "calc_clear") {
        carts.delete(interaction.user.id);
        pendingItem.delete(interaction.user.id);

        const ui = await buildCalculatorUI(interaction.user.id);
        return interaction.reply({
          ...ui,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "calc_finish") {
        const cart = carts.get(interaction.user.id) || [];

        if (cart.length === 0) {
          return interaction.reply({
            content: "❌ Coșul tău este gol.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const totals = await calculateTotals(cart);

        const resultText =
          totals.length > 0
            ? totals.map(([name, qty]) => `• **${name}**: ${qty}`).join("\n")
            : "Nu există materiale pentru itemele selectate.";

        return interaction.reply({
          content:
            `**Rezultat calcul privat**\n\n` +
            `**Coș:**\n${formatCart(cart)}\n\n` +
            `**Materiale totale necesare:**\n${resultText}`,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "calc_select_item") {
        const items = await getItems();
        const chosen = items.find((x) => String(x.id) === interaction.values[0]);

        if (!chosen) {
          return interaction.reply({
            content: "❌ Item invalid.",
            flags: MessageFlags.Ephemeral,
          });
        }

        pendingItem.set(interaction.user.id, {
          itemId: chosen.id,
          itemName: chosen.name,
        });

        return interaction.reply({
          content: `✅ Ai selectat **${chosen.name}**.\nAcum alege cantitatea din meniul de mai jos.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.customId === "calc_select_qty") {
        const selected = pendingItem.get(interaction.user.id);

        if (!selected) {
          return interaction.reply({
            content: "❌ Mai întâi selectează un item.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const qty = Number(interaction.values[0]);
        const cart = carts.get(interaction.user.id) || [];

        const existing = cart.find((x) => x.itemId === selected.itemId);
        if (existing) {
          existing.qty += qty;
        } else {
          cart.push({
            itemId: selected.itemId,
            itemName: selected.itemName,
            qty,
          });
        }

        carts.set(interaction.user.id, cart);
        pendingItem.delete(interaction.user.id);

        const ui = await buildCalculatorUI(interaction.user.id);
        return interaction.reply({
          ...ui,
          flags: MessageFlags.Ephemeral,
        });
      }
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
